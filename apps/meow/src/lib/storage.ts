import FeedStore from "orbit-db-feedstore";
import { ZCHAIN, ZStore, assertValidzId, types, decode } from "zchain-core";
import { DB_ADDRESS_PROTOCOL, password } from "./constants";
import { pipe } from 'it-pipe';
import chalk from "chalk";
import { MeowDBs } from "../types";
import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";



// meow operations are at the "application" level
const APP_PATH = 'apps';

/**
 * Class to storage at "meow" level (application level)
 */
export class MStore extends ZStore {
  // key value storage of nodes i follow
  zChain: ZCHAIN;
  protected meowDbs: MeowDBs;

  /**
   * Initializes MStore
   * @param libp2p libp2p node
   */
  constructor (zChain: ZCHAIN) {
    super(zChain.ipfs, zChain.node, password);

    // todo: check why we need this?
    this.dbs = zChain.zStore.dbs

    this.zChain = zChain;
    this.orbitdb = zChain.zStore.orbitdb;
    this.meowDbs = {} as any;
    this.meowDbs.followingZIds = {} as any;
    this.meowDbs.followingChannels = {} as any;
    this.meowDbs.channels = {} as any;
  }

  peerID() { return this.libp2p.peerId.toB58String(); }

  // todo: review and remove
  // update: i think for sandbox we can use this logic
  private async _initModules() {
    this.zChain.peerDiscovery.onConnect(async (connection) => {
      const [_, __, displayStr] = this.getNameAndPeerID(connection.remotePeer.toB58String())
      console.log('Connection established to:', displayStr);
    });

    this.zChain.peerDiscovery.onDiscover((peerId) => {
      const [_, __, displayStr] = this.getNameAndPeerID(peerId.toB58String())
      console.log('Discovered:', displayStr);
    });
  }

  private async _subscribeToFeed(peerId: string) {
    await this.ipfs.pubsub.subscribe(`${peerId}.sys.feed`, async (msg: types.PubSubMessage) => {
      const orbitDBAddress = uint8ArrayToString(msg.data);

      // just a sanity check, it should be defined.
      if (this.meowDbs.followingZIds) {
        this.meowDbs.followingZIds = await this.getKeyValueOrbitDB(
          this.peerID() + "." + APP_PATH + '.followers'
        );
      }

      if (this.meowDbs.followingZIds.get(msg.from) === 1 || this.meowDbs.followingZIds.get(msg.from) === undefined) {
        await this.meowDbs.followingZIds.put(msg.from, uint8ArrayToString(msg.data));
        this.dbs.feeds[msg.from] = await this.orbitdb.open(orbitDBAddress) as FeedStore<unknown>;
        this.listenForReplicatedEvent(this.dbs.feeds[msg.from]);
      }
    });
  }

  async init(): Promise<void> {
    const basePath = this.peerID() + "." + APP_PATH;
    this.meowDbs.followingZIds = await this.getKeyValueOrbitDB(
      basePath + '.followers'
    );
    this.meowDbs.followingChannels = await this.getKeyValueOrbitDB(
      basePath + '.channels'
    );

    await this._initModules();

    // during initialization, load the remote databases
    // (if we're following that peer and we have the remote address of that peer's orbitdb)
    // subscribe & listen to the events from peers we're following, & they broadcast their feed address
    const followerList = this.meowDbs.followingZIds.all;
    for (const key in followerList) {
      const feed = this.dbs.feeds[key];

      // we're following this guy, but we don't have the addr yet
      if (this.meowDbs.followingZIds.get(key) === 1) {
        await this._subscribeToFeed(key);
      }

      // now open the databases as per usual
      const remoteAddress = this.meowDbs.followingZIds.get(key);
      if (!feed && typeof remoteAddress === "string") {
        this.dbs.feeds[key] = await this.orbitdb.open(remoteAddress) as FeedStore<unknown>;
        this.listenForReplicatedEvent(this.dbs.feeds[key]);
      }
    }

    // similarly load db for each "channel" (#hashtag)
    const channelsList = this.meowDbs.followingChannels.all;
    for (const key in channelsList) {
      // subscribe again if you're restarting the node
      this.zChain.subscribe(key);

      const channelDB = this.meowDbs.channels[key];
      const remoteAddress = this.meowDbs.followingChannels.get(key);
      if (!channelDB && typeof remoteAddress === "string") {
        this.meowDbs.channels[key] = await this.orbitdb.open(remoteAddress) as FeedStore<unknown>;
        this.listenForReplicatedEvent(this.meowDbs.channels[key]);
      }
    }

    // a) broadcast your "own" feed database address on the channel
    setInterval(async () => {
      const feedDB = this.getFeedDB();
      await this.ipfs.pubsub.publish(
        `${this.peerID()}.sys.feed`,
        fromString(feedDB.address.toString())
      );
    }, 10 * 1000);
  }

  // log replication ("sync" events accross all dbs)
  listenForReplicatedEvent(feed: FeedStore<unknown>): void {
    if (feed) {
      feed.events.on('replicated', (address) => {
        //console.log('\n* ' + chalk.green(`Successfully synced db: ${address}`) + ' *\n');
      })
    }
  }

  // append to the Followers database (keyvalue) store for the
  // peerId you follow
  async followZId(peerIdOrName: string): Promise<void> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    const data = this.meowDbs.followingZIds.get(peerId);
    if (data === undefined) {
      await this.meowDbs.followingZIds.put(peerId, 1);
      await this._subscribeToFeed(peerId);
      console.info(chalk.green(`Great! You're now following ${displayStr}`));
    } else {
      console.info(chalk.yellow(`Already following ${displayStr}`));
    }
  }

  async unfollowZId(peerIdOrName: string): Promise<void> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    const data = this.meowDbs.followingZIds.get(peerId);
    if (data !== undefined) {
      await this.meowDbs.followingZIds.del(peerId);
      console.info(chalk.green(`You've successfully unfollowed ${displayStr}`));
    }

    const feed = this.dbs.feeds[peerId];
    if (feed && peerId !== this.peerID()) {
      await feed.drop(); // drop the db
      this.dbs.feeds[peerId] = undefined;
    }
  }

  async displayFeed(peerIdOrName: string, n: number): Promise<void> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    if (peerId !== this.peerID() && this.meowDbs.followingZIds.get(peerId) === undefined) {
      console.error(
        chalk.red(`Cannot fetch feed (Invalid request): You're not following ${displayStr}`)
      );
      return;
    }

    const feed = this.dbs.feeds[peerId];
    if (feed === undefined) {
      console.error(
        chalk.red(`Error while loading feed for zId ${displayStr}: not found. The node is possibly offline and feeds are not synced yet.`)
      );
      return;
    }

    await this.listMessagesOnFeed(peerId, n);
  }

  // list peers followed by "this" node
  listFollowedPeers() {
    const all = this.meowDbs.followingZIds.all;
    if (Object.entries(all).length === 0) {
      console.log(chalk.yellow(`Not following any peer`));
      return;
    }

    console.log(`\n${this.peerID()} is following peers:`);
    for (const key in all) {
      const [_, __, displayStr] = this.getNameAndPeerID(key);
      console.log(`${chalk.green('>')} ${displayStr}`);
    }
  }

  listFollowedChannels() {
    const all = this.meowDbs.followingChannels.all;
    console.log(`\n${this.peerID()} is following channels:`);
    for (const key in all) {
      console.log(`${chalk.green('>')} ${key}`);
    }
  }

  /**
   * Get public orbitdb address from a channel
   * @param channel channel to extract db address of
   */
  private async getChannelPublicDBAddress(channel: string): Promise<string> {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    const options = {
      // Give write access to ourselves
      accessController: {
        write: ['*']
      },
      meta: { channel: channel } // this is what makes the db for each channel "unique" from one another
    }
    const address = await this.orbitdb.determineAddress(
      APP_PATH + `.${channel}.feed`, 'feed', options
    );
    return address.toString();
  }

  /**
   * Follow a channel (#hashtag). Save public orbitdb address of the channel
   * to the "followingChannels" database
   * @param channel channel to follow
   */
  async followChannel(channel: string) {
    const data = this.meowDbs.followingChannels.get(channel);
    if (data === undefined) {
      this.zChain.subscribe(channel);

      // save {"channel": "channel-db-address"} to db
      const address = await this.getChannelPublicDBAddress(channel);
      await this.meowDbs.followingChannels.put(channel, address);

      // also initialize the database in our local map
      this.meowDbs.channels[channel] = await this.orbitdb.open(address) as FeedStore<unknown>;

      console.info(chalk.green(`Great! You're now following channel ${channel}`));
    } else {
      console.info(chalk.yellow(`Already following channel ${channel}`));
    }
  }

  /**
   * Unfollow a channel (#hashtag). Remove entry from database, and drop the channel
   * database, if present.
   * @param channel channel to unfollow
   */
  async unFollowChannel(channel: string) {

    const data = this.meowDbs.followingChannels.get(channel);
    if (data !== undefined) {
      await this.meowDbs.followingChannels.del(channel);
      console.info(chalk.green(`You've successfully unfollowed ${channel}`));
    }

    const channelDb = this.meowDbs.channels[channel];
    if (channelDb) {
      await channelDb.drop(); // drop the db
      this.meowDbs.channels[channel] = undefined;
    }
  }

  /**
   * Publish a message on a channel. Note: it doesn't matter if "this" node is following
   * this channel or not, we write to the orbitdb on the publishing side of pubsub msg.
   * @param channel channel on which to publish message on
   */
  async publishMessageOnChannel(channel: string, message: string, channels: string[]): Promise<void> {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    let db: FeedStore<unknown>;
    let dropDB = false;
    if (this.meowDbs.channels[channel]) {
      db = this.meowDbs.channels[channel];
    } else {
      const address = await this.getChannelPublicDBAddress(channel);
      db = await this.orbitdb.open(address) as FeedStore<unknown>;
      dropDB = true; // since we're not following this channel, we should drop this db, after publish
    }

    await this.appendZChainMessageToFeed(db, message, channels);

    // TODO: think about it more (dropping a db if not following -- the problem is if no
    // other node is online, and we publish & drop the db, the "appended" data us actually LOST)
    //if (dropDB === true) { await db.drop(); }
  }

  /**
   * Lists messages published on a channel.
   * @param channel channel of which to display feed of
   * @param n number of messages (in reverse order) to list
   * @returns
   */
  async getChannelFeed(channel: string, n:number): Promise<types.ZChainMessage[]> {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    let channelFeed =[]
    if (this.meowDbs.followingChannels.get(channel) === undefined) {
      console.error(
        chalk.red(`Cannot fetch feed (Invalid request): You're not following ${channel}`)
      );
      return[];
    }

    const channelDB = this.meowDbs.channels[channel];
    if (channelDB === undefined) {
      console.error(
        chalk.red(`Error while loading feed for ${channel}: NOT FOUND.`)
      );
      return[];
    }

    await channelDB.load(n); // load last "n" messages to memory
    const messages = channelDB.iterator({
      limit: n, reverse: true
    }).collect();
    for (const m of messages){
       channelFeed.push(m.payload.value as types.ZChainMessage)
    }
    return channelFeed
  }
  async displayChannelFeed(channel: string, n: number): Promise<void> {
    console.log(chalk.cyanBright(`Last ${n} messages published on ${channel}`));
    const messages = await this.getChannelFeed(channel,n)
    for (const m of messages) {
      console.log(`${chalk.green('>')} `, {
        ...m,
        message: await decode(m.message, password)
      });
    }
  }


  /**
   * Lists all db's with address & no. of entries
   */
  async listDBs(): Promise<void> {
    const dbs = {};
    const channelsList = this.meowDbs.followingChannels.all;
    const followerList = this.meowDbs.followingZIds.all;
    const addressBook = this.dbs.addressBook.all;

    dbs["followingZIds"] = {
      "address": this.meowDbs.followingZIds.address.toString(),
      "entries": Object.entries(followerList).length
    }

    dbs["followingChannels"] = {
      "address": this.meowDbs.followingChannels.address.toString(),
      "entries": Object.entries(channelsList).length
    }

    dbs["addressBook"] = {
      "address": this.dbs.addressBook.address.toString(),
      "entries": Object.entries(addressBook).length
    }

    dbs["Peer feeds"] = {};
    for (const key in followerList) {
      const feed = this.dbs.feeds[key];
      const remoteAddress = this.meowDbs.followingZIds.get(key);
      if (feed && typeof remoteAddress === "string") {
        await feed.load();
        dbs["Peer feeds"][key] = {
          "address": remoteAddress,
          "entries": feed.iterator({ limit: -1 }).collect().length
        }
      }
    }

    dbs["Channel feeds"] = {};
    for (const key in channelsList) {
      const channelDB = this.meowDbs.channels[key];
      const remoteAddress = this.meowDbs.followingChannels.get(key);
      if (channelDB && typeof remoteAddress === "string") {
        await channelDB.load();
        dbs["Channel feeds"][key] = {
          "address": remoteAddress,
          "entries": channelDB.iterator({ limit: -1 }).collect().length
        }
      }
    }

    console.log(dbs);
  }
}

