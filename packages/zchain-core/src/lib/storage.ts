import { Libp2p as ILibp2p } from "libp2p";
import path from "path";
import { DBs, LogPaths, ZChainMessage } from "../types.js";
import { decode, encode } from "./encryption.js";

import { IPFS as IIPFS } from 'ipfs';
import OrbitDB from "orbit-db";
import FeedStore from "orbit-db-feedstore";
import KeyValueStore from "orbit-db-kvstore";
import chalk from "chalk";
import { assertValidzId } from "./zid.js";
import { DB_PATH } from "./constants.js";

// zchain operations are at the "system" level
const SYSPATH = 'sys';

function isValidzId(zId: string): Boolean {
  let isValid = true;
  try {
    assertValidzId(zId);
  } catch (error) {
    isValid = false;
  }

  return isValid;
}

/**
 * Class to handle data of libp2p libp2p (persisting data through hypercore append only logs)
 * + Store(append) newly discovered peers to logs
 */
export class ZStore {
  protected libp2p: ILibp2p;
  protected ipfs: IIPFS;
  orbitdb: OrbitDB;
  private password: string;
  private paths: LogPaths;
  dbs: DBs;
  private feedMap: Map<string, number>

  /**
   * Initializes zchain-db (hypercore append only log)
   * @param libp2p libp2p node
   */
  constructor (ipfs: IIPFS, libp2p: ILibp2p, password: string) {
    this.ipfs = ipfs;
    this.libp2p = libp2p;

    // going through "type hacks" (as they'll be initialized later)
    this.paths = {} as any;
    this.dbs = {} as any;
    this.dbs.feeds = {};
    this.feedMap = new Map<string, number>();

    // save password
    if (password.length !== 16) {
      throw new Error("Password must be a string of length 16");
    } else {
      this.password = password;
    }
  }

  async init(zIdName: string): Promise<void> {
    const peerId = await this.ipfs.config.get('Identity.PeerID')
    this.orbitdb = await OrbitDB.createInstance(
      this.ipfs as any,
      {
        directory: path.join(DB_PATH, zIdName),
        peerId: peerId.toString(),
        id: peerId.toString() // note: this is a hack
      } as any
    );

    // eg. ./zchain-db/{peerId}/sys/<log>
    this.paths.default = this.libp2p.peerId.toString() + "." + SYSPATH;
    this.paths.feeds = this.paths.default + '.feed';
    this.paths.addressBook = this.paths.default + '.addressBook';
    //this.paths.channels = path.join(this.paths.default, 'channels');

    this.dbs.feeds[this.libp2p.peerId.toString()] = await this.getFeedsOrbitDB(
      this.paths.feeds
    );
    this.dbs.addressBook = await this.getKeyValueOrbitDB(this.paths.addressBook);
  }

  /**
   * @returns orbitdb database of the node's feed (list of messages posted by node)
   */
  getFeedDB(): FeedStore<unknown> {
    return this.dbs.feeds[this.libp2p.peerId.toString()];
  }

  /**
   * Initializes an orbitdb of type "keyValue"
   * @param dbName name of the database
   */
  async getKeyValueOrbitDB(dbName: string): Promise<KeyValueStore<unknown>> {
    const db = await this.orbitdb.keyvalue(dbName);
    await db.load();
    return db;
  }

  /**
   * Initialzes an orbitdb of type "feed" (mutable log with traversible history)
   * @param dbName name of the database
   */
  async getFeedsOrbitDB(dbName: string) {
    const db = await this.orbitdb.feed(dbName);
    await db.load();
    return db;
  }

  async appendZChainMessageToFeed(
    feedStore: FeedStore<unknown>,
    message: string,
    channels: string[]
    ): Promise<void> {
    await feedStore.load(1); // load last block to memory

    // this is a bug (check it)
    let prev = null;
    const lastBlock = feedStore.iterator({ limit: 1, reverse: true }).collect()
      .map((e) => e.payload.value);
    if (lastBlock.length !== 0) {
      const parsed = lastBlock[0] as ZChainMessage;
      prev = parsed.message; // hash of prev message
    }

    // verify you cannot spoof a signature, like i can't just copy it & spam it
    const zChainMessage = {
      prev: prev,
      from: this.libp2p.peerId.toString(),
      channel: channels,
      message: await encode(message, this.password),
      // timestamp: Math.round(+new Date() / 1000),
    }

    await feedStore.add(zChainMessage);
  }

  /**
   * Handle publishing of a message
   * @param channel channel accross which message was published
   * @param message libp2p pubsub message
   */
  async handlePublish(message: string, channels: string[]): Promise<void> {
    // const pubsubMsg = {
    //   channelIDs: [channel],
    //   from: this.libp2p.peerId.toB58String(),
    //   data: fromString(message),
    //   seqno: new Uint8Array([0]),
    //   signature: new Uint8Array([0]),
    //   key: new Uint8Array([0]),
    //   receivedFrom: this.libp2p.peerId.toB58String()
    // };

    // only append to my feed a single time (eg. if we're publishing same
    // message accross multiple channels, we only want to append it to feed single time)
    const currTs = Math.round(+new Date() / 10000);
    if (this.feedMap.get(message + currTs.toString()) === undefined) {
      const feedCore = this.dbs.feeds[this.libp2p.peerId.toString()];
      await this.appendZChainMessageToFeed(feedCore, message, channels);
      this.feedMap.set(message + currTs.toString(), 1);
    }
  }

  /**
   * Returns last "n" messages published by a node
   */
  async getMessagesOnFeed(peerIdStr: string, n: number): Promise<Object[]> {
    const feedStore = this.dbs.feeds[peerIdStr];
    if (feedStore === undefined) {
      console.error("feed store not found for peer ", peerIdStr);
      return [];
    }

    await feedStore.load(n); // load last "n" messages to memory
    const messages = feedStore.iterator({
      limit: n, reverse: true
    }).collect();

    const messagesOnFeed = [];
    for (const m of messages) {
      const msg = m.payload.value as ZChainMessage;
      messagesOnFeed.push({
        ...msg,
        message: await decode(msg.message, this.password)
      });
    }

    return messagesOnFeed;
  }

  /**
   * Determines {peerId, name, display string} for given peerId/name
   */
  getNameAndPeerID(peerIdOrName: string): [string, string | undefined, string] {
    let peerId: string, name: string | undefined, str: string;
    if (isValidzId(peerIdOrName)) {
      peerId = peerIdOrName;
      name = this.dbs.addressBook.get(peerId) as string | undefined;
      str = name !== undefined ? `${peerId} (${name})` : `${peerId}`
    } else {
      name = peerIdOrName;

      // if you get a name, peerID must be defined
      if (this.dbs.addressBook.get(name) === undefined) {
        throw new Error(chalk.red(`No peer id found for name ${name}`));
      } else {
        peerId = this.dbs.addressBook.get(name) as string;
        str = `${peerId} (${name})`;
      }
    }

    return [peerId, name, str];
  }

  /**
   * Sets a name of the peerId in the local address book
   * @param peerId peerID
   * @param name name to set
   */
  async setNameInAddressBook(peerId: string, name: string, force: boolean = false): Promise<void> {
    assertValidzId(peerId);

    let db = this.dbs.addressBook;
    if (!db) {
      console.log("Internal error: address book db not defined in ctx");
      return;
    }

    const peerName = await db.get(peerId);
    const peerID = await db.get(name);
    if (force === true) {
      // remove old names
      if (peerName) db.del(peerName as string);
      if (peerID) db.del(peerID as string);

      // set new names
      db.set(peerId, name);
      db.set(name, peerId);
    } else {
      if (peerName !== undefined) {
        console.warn(chalk.yellowBright(`Name for peer ${peerId} has already been set to ${peerName}`));
        return;
      } else if (peerID !== undefined) {
        console.warn(chalk.yellowBright(`A peerId has already been set against this name (${name}) to ${peerID}`));
        return;
      } else {
        db.set(peerId, name);
        db.set(name, peerId);
      }
    }

    console.info(chalk.green(`Successfully set name for ${peerId} to ${name} in local address book`));
  }
}
