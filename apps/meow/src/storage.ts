import FeedStore from "orbit-db-feedstore";
import KeyValueStore from "orbit-db-kvstore";
import { ZCHAIN, ZStore } from "zchain-core";
import { DB_ADDRESS_PROTOCOL, password } from "./constants";
import { pipe } from 'it-pipe';
import chalk from "chalk";

// meow operations are at the "application" level
const APP_PATH = 'apps';

/**
 * Class to storage at "meow" level (application level)
 */
export class MStore extends ZStore {
  // key value storage of nodes i follow
  private followers: KeyValueStore<unknown>;

  /**
   * Initializes MStore
   * @param libp2p libp2p node
   */
  constructor (zChain: ZCHAIN) {
    super(zChain.ipfs, zChain.node, password);
    this.orbitdb = zChain.zStore.orbitdb;
  }


  async init(): Promise<void> {
    const basePath = this.libp2p.peerId.toB58String() + "." + APP_PATH;
    this.followers = await this.getKeyValueOrbitDB(
      basePath + '.followers'
    );

    // during initialization, load the remote databases
    // (if we're following that peer and we have the remote address of that peer's orbitdb)
    const followerList = this.followers.all;
    for (const key in followerList) {
      const feed = this.dbs.feeds[key];
      const remoteAddress = this.followers.get(key);
      if (!feed && typeof remoteAddress === "string") {
        this.dbs.feeds[key] = await this.orbitdb.open(remoteAddress) as FeedStore<unknown>;
        this.listenForReplicatedEvent(this.dbs.feeds[key]);
      }
    }
  }

  // log replication ("sync" events accross all dbs)
  listenForReplicatedEvent(feed: FeedStore<unknown>): void {
    if (feed) {
      feed.events.on('replicated', (address) => {
        console.log(chalk.green(`\n* Successfully synced db: ${address} *\n`));
      })
    }
  }

  // listen to db address on new connections
  async handleIncomingOrbitDbAddress (zChain: ZCHAIN): Promise<void> {
    let self = this;

    zChain.peerDiscovery.handleProtocol(DB_ADDRESS_PROTOCOL, async ({ stream, connection }) => {
      pipe(
        stream.source,
        async function (source: any) {
          for await (const msg of source) {
            // if i follow this connection, and feed is not defined yet, load(replicate) it's db
            const address = String(msg).toString().replace('\n', '');
            if (
              address.includes(`/orbitdb/`)
              && self.followers.get(connection.remotePeer.toB58String()) !== undefined
            ) {
              let feed = self.dbs.feeds[connection.remotePeer.toB58String()];

              // save db address of the node we're follwing, in our "followers" keyValue store
              self.followers.put(connection.remotePeer.toB58String(), address);

              // load the db if not loaded yet
              if (feed === undefined) {
                feed = await self.orbitdb.open(address) as FeedStore<unknown>;
                self.dbs.feeds[connection.remotePeer.toB58String()] = feed;
                self.listenForReplicatedEvent(feed);
              }
            }
          }
        }
      )
    });

  }

  // append to the Followers database (keyvalue) store for the
  // peerId you follow
  async follow(peerId: string): Promise<void> {
    const data = this.followers.get(peerId);

    if (data === undefined) {
      await this.followers.put(peerId, 1);
      console.info(chalk.green(`Great! You're now following ${peerId}`));
    } else {
      console.info(chalk.yellow(`Already following ${peerId}`));
    }
  }

  async unFollow(peerId: string): Promise<void> {
    const data = this.followers.get(peerId);

    if (data !== undefined) {
      await this.followers.del(peerId);
      console.info(chalk.green(`You've successfully unfollowed ${peerId}`));
    }
  }

  async displayFeed(peerId: string, n: number): Promise<void> {
    if (this.followers.get(peerId) === undefined) {
      console.error(
        chalk.red(`Cannot fetch feed (Invalid request): You're not following ${peerId}`)
      );
      return;
    }

    const feed = this.dbs.feeds[peerId];
    if (feed === undefined) {
      console.error(
        chalk.red(`Error while loading feed for zId ${peerId}: not found. The node is possibly offline and feeds are not synced yet.`)
      );
      return;
    }

    await this.listMessagesOnFeed(peerId, n);
  }

  // list peers followed by "this" node
  listFollowers() {
    const all = this.followers.all;
    console.log(`\n${this.libp2p.peerId.toB58String()} is following:`);
    for (const key in all) {
      console.log(`${chalk.green('>')} ${key}`);
    }
    console.log('\n');
  }
}

