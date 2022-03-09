import Libp2p from "libp2p";
import Hypercore from "hypercore";
import Hyperbee from "hyperbee";
import fs from "fs";
import path from "path";
import { HyperBeeDBs, Cores, LogPaths, PubSubMessage } from "../types";
import { decode, encode } from "./encryption";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { fromString } from "uint8arrays/from-string";

// maybe we should change this to ~/.zchain-db ?
const ZCHAIN_DEFAULT_STORAGE_DIR = "./zchain-db";

// zchain operations are at the "system" level
const SYSPATH = 'sys';

/**
 * Class to handle data of libp2p node (persisting data through hypercore append only logs)
 * + Store(append) newly discovered peers to logs
 */
export class ZStore {
  private node: Libp2p;
  private password: string;
  private paths: LogPaths;
  private cores: Cores;
  private dbs: HyperBeeDBs;
  private feedMap: Map<string, number>

  /**
   * Initializes zchain-db (hypercore append only log)
   * @param node libp2p node
   */
  constructor (node: Libp2p, password: string) {
    this.node = node;

    // going through "type hacks" (as they'll be initialized later)
    this.paths = {} as any;
    this.cores = {} as any;
    this.cores.feeds = {};
    this.cores.topics = {};
    this.dbs = {} as any;
    this.feedMap = new Map<string, number>();

    // save password
    if (password.length !== 16) {
      throw new Error("Password must be a string of length 16");
    } else {
      this.password = password;
    }
  }

  async init(): Promise<void> {
    // eg. ./zchain-db/{peerId}/sys/<log>
    this.paths.default = path.join(ZCHAIN_DEFAULT_STORAGE_DIR, this.node.peerId.toB58String(), SYSPATH);
    this.paths.discovery = path.join(this.paths.default, 'discovery');
    this.paths.feeds = path.join(this.paths.default, 'feeds');
    this.paths.topics = path.join(this.paths.default, 'topics');

    const discoveryHypercoreFeed = await this.getHypercore(this.paths.discovery);
    this.cores.feeds[this.node.peerId.toB58String()] = await this.getHypercore(
      path.join(this.paths.feeds, this.node.peerId.toB58String(), 'feed')
    );
    this.dbs.discovery = await this.initializeHyperbee(discoveryHypercoreFeed);
  }

  /**
   * Initialzes a hypercore feed, at a given path. If there is already a log
   * present at the path, it will intialize the feed present there using it's
   * "public key"
   * @param logPath path at which the log resides
   */
  async getHypercore(logPath: string) {
    const core = new Hypercore(
      logPath, { valueEncoding: 'utf-8' }
    );
    await core.ready();
    return core;
  }

  /**
   * Initialzes new hyperbee (an append only B-Tree) using a hypercore feed.
   * @param feed hypercore feed
   */
  async initializeHyperbee(feed: Hypercore) {
    const db = new Hyperbee(feed, {
      keyEncoding: 'utf-8',
      valueEncoding: 'utf-8'
    })

    await db.ready();
    return db;
  }

  /**
   * Appends {hash(peerId): 1} to the B-Tree, if not already present
   * @param peerId peerId in string
   */
  async appendDiscoveryLog(peerId: string): Promise<void> {
    const encodedData = await encode(peerId, this.password);

    const data = await this.dbs.discovery.get(encodedData);
    if (data === null) {
      await this.dbs.discovery.put(encodedData, 1);
    }
  }

  async _append(core: Hypercore, topic: string, message: PubSubMessage) {
    let prev = null;
    if (core.length !== 0) {
      const lastBlock = await core.get(core.length - 1);
      const parsed = JSON.parse(lastBlock);
      //console.log('P ', parsed);

      prev = parsed.message; // hash of prev message
    }

    const strMsg = uint8ArrayToString(message.data);
    const data = {
      prev: prev,
      from: message.from,
      topic: topic,
      message: await encode(strMsg, this.password),
      timestamp: Math.round(+new Date() / 1000),
      // signature: message.signature,
      // seqno: message.seqno,
      // key: message.key
    }

    await core.append([JSON.stringify(data)]);
  }

  /**
   * Appends message to topic feeds
   * @param message libp2p pubsub message
   */
  async appendMessageToTopicsFeed(topic: string, message: PubSubMessage): Promise<void> {
    if (this.cores.topics[topic] === undefined) {
      this.cores.topics[topic] = await this.getHypercore(
        path.join(this.paths.topics, topic)
      );
    }

    await this._append(this.cores.topics[topic], topic, message);
  }

  /**
   * Appends message to feeds (user's feeds + topic feeds)
   * @param topic topic accross which message was published
   * @param message libp2p pubsub message
   */
  async handleListen(topic: string, message: PubSubMessage): Promise<void> {
    // only append to "topics" cores if we received the message from someone else
    // self messaging feeds are handled in "publish"
    if (message.from === this.node.peerId.toB58String()) { return; }

    const feedCore = this.cores.feeds[this.node.peerId.toB58String()];
    await this._append(feedCore, topic, message);

    for (const topic of message.topicIDs) {
      this.appendMessageToTopicsFeed(topic, message);
    }
  }

  /**
   * Handle publishing of a message
   * @param topic topic accross which message was published
   * @param message libp2p pubsub message
   */
  async handlePublish(topic: string, message: string): Promise<void> {
    const pubsubMsg = {
      topicIDs: [topic],
      from: this.node.peerId.toB58String(),
      data: fromString(message),
      seqno: new Uint8Array([0]),
      signature: new Uint8Array([0]),
      key: new Uint8Array([0]),
      receivedFrom: this.node.peerId.toB58String()
    };

    // only append to my feed a single time (eg. if we're publishing same
    // message accross multiple topics, we only want to append it to feed single time)
    const currTs = Math.round(+new Date() / 10000);
    if (this.feedMap.get(message + currTs.toString()) === undefined) {
      const feedCore = this.cores.feeds[this.node.peerId.toB58String()];
      await this._append(feedCore, topic, pubsubMsg);
      this.feedMap.set(message + currTs.toString(), 1);
    }

    this.appendMessageToTopicsFeed(topic, pubsubMsg);
  }

  /**
   * Lists discovered peers from the hyperbee db
   */
  async list(): Promise<void> {
    for await (const { key, value } of this.dbs.discovery.createReadStream()) {
      const decodedData = await decode(key, this.password);
      console.log(`Discovered: ${decodedData}`)
    }
  }
}
