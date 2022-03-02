import Libp2p from "libp2p";
import hypercore from "hypercore";
import Hyperbee from "hyperbee";
import fs from "fs";
import path from "path";
import { HyperBeeDBs, LogFeeds, LogPaths } from "../types";
import { decode, encode } from "./encryption";

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
  private paths: LogPaths;
  private feeds: LogFeeds;
  private dbs: HyperBeeDBs;


  /**
   * Initializes zchain-db (hypercore append only log)
   * @param node libp2p node
   */
  constructor (node: Libp2p, password: string) {
    this.node = node;

    // going through "type hacks" (as they'll be initialized later)
    this.paths = {} as any;
    this.feeds = {} as any;
    this.dbs = {} as any;

    // save password
    if (password.length !== 16) {
      throw new Error("Password must be a string of length 16");
    } else {
      const baseDirPath = path.join(ZCHAIN_DEFAULT_STORAGE_DIR, this.node.peerId.toB58String());
      const passwordFilePath = path.join(baseDirPath, "password");

      if (fs.existsSync(passwordFilePath)) {
        console.info('password file already present. skipping.')
      } else {
        // save password in db (eg. at ./zchain-db/{peerId}/password)
        fs.mkdirSync(baseDirPath, { recursive: true });
        fs.writeFileSync(passwordFilePath, password);
      }
    }
  }

  /**
   * @returns password of zchain-db (saved at peer root)
   */
  password(): string {
    return fs.readFileSync(
      path.join(ZCHAIN_DEFAULT_STORAGE_DIR, this.node.peerId.toB58String(), "password"), "utf-8"
    );
  }

  async init(): Promise<void> {
    // eg. ./zchain-db/{peerId}/sys/<log>
    this.paths.default = path.join(ZCHAIN_DEFAULT_STORAGE_DIR, this.node.peerId.toB58String(), SYSPATH);
    this.paths.discovery = path.join(this.paths.default, 'discovery');

    const discoveryHypercoreFeed = this.initializeHypercore(this.paths.discovery);
    this.dbs.discovery = await this.initializeHyperbee(discoveryHypercoreFeed);
  }

  /**
   * Initialzes a hypercore feed, at a given path. If there is already a log
   * present at the path, it will intialize the feed present there using it's
   * "public key"
   * @param logPath path at which the log resides
   */
  initializeHypercore(logPath: string) {
    let feed: hypercore;
    if (!fs.existsSync(logPath)) {
      // if not found, create a new hypercore db at given "logPath"
      feed = hypercore(
        logPath, { valueEncoding: 'utf-8' }
      );
    } else {
      // instantiate using existing db's key
      const key = fs.readFileSync(path.join(logPath, "key"));
      feed = hypercore(
        logPath, key, { valueEncoding: 'utf-8' }
      );
    }

    return feed;
  }

  /**
   * Initialzes new hyperbee (an append only B-Tree) using a hypercore feed.
   * @param feed hypercore feed
   */
  async initializeHyperbee(feed: hypercore) {
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
    const encodedData = await encode(peerId, this.password());

    const data = await this.dbs.discovery.get(encodedData);
    if (data === null) {
      await this.dbs.discovery.put(encodedData, 1);
    }
  }

  /**
   * Lists discovered peers from the hyperbee db
   */
  async list(): Promise<void> {
    for await (const { key, value } of this.dbs.discovery.createReadStream()) {
      const decodedData = await decode(key, this.password());
      console.log(`Discovered: ${decodedData}`)
    }
  }
}
