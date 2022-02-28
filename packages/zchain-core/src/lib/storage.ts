import Libp2p from "libp2p";
import hypercore from "hypercore";
import fs from "fs";
import path from "path";
import { LogFeeds, LogPaths } from "../types";

// maybe we should change this to ~/.zchain-db ?
const ZCHAIN_DEFAULT_STORAGE_DIR = "./zchain-db";

// zchain operations are at the "system" level
const SYSPATH = 'sys';

/**
 * Class to handle data of libp2p node (persisting data through hypercore append only logs)
 * + Store(append) newly discovered peers to logs
 */
export class ZStore {
  private node: Libp2p | undefined;
  private paths: LogPaths;
  private feeds: LogFeeds;


  /**
   * Initializes zchain-db (hypercore append only log)
   * @param node libp2p node
   */
  constructor (node?: Libp2p) {
    this.node = node;
    this.paths = {} as any;
    this.feeds = {} as any;

    // eg. ./zchain-db/{peerId}/sys/<log>
    this.paths.default = path.join(ZCHAIN_DEFAULT_STORAGE_DIR, this.node.peerId.toB58String(), SYSPATH);
    this.paths.discovery = path.join(this.paths.default, 'discovery');

    this.feeds.discovery = this.initializeHypercore(this.paths.discovery);
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

  appendDiscoveryLog(data: string): void {
    this.feeds.discovery.append(data);
  }
}
