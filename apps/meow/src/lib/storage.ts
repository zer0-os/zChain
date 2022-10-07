import { ZCHAIN, ZStore, types, decode } from "zchain-core";
import { DEFAULT_NETWORK, GENERAL_CHANNEL, password } from "./constants.js";
import chalk from "chalk";
import { MeowPrivateYDocs, MeowPublicYDocs, Network } from "../types.js";
import * as Y from 'yjs';

// meow operations are at the "application" level
const APP_PATH = 'apps';

/**
 * Class to storage at "meow" level (application level)
 */
export class MStore extends ZStore {
  // key value storage of nodes i follow
  zChain: ZCHAIN;
  protected meowPublicYDocs: MeowPublicYDocs;
  protected meowPrivateYDocs: MeowPrivateYDocs;
  protected channelYDocs: types.YDocMap;

  /**
   * Initializes MStore
   * @param zChain zChain instance
   */
  constructor (zChain: ZCHAIN) {
    super(zChain.node, password);

    this.zChain = zChain;
    this.persistence = zChain.zStore.persistence;
    this.yDocs = zChain.zStore.yDocs;
    this.publicYDoc = zChain.zStore.publicYDoc;
    this.privateYDoc = zChain.zStore.privateYDoc;
    this.meowPublicYDocs = {} as any;
    this.meowPrivateYDocs = {} as any;
    this.channelYDocs = {} as any;
  }

  peerID() { return this.libp2p.peerId.toString(); }

  // todo: review and remove
  // update: i think for sandbox we can use this logic
  private async _initModules() {
    this.zChain.peerDiscovery.onConnect(async (event) => {
      const connection = event.detail;

      const [_, __, displayStr] = this.getNameAndPeerID(connection.remotePeer.toString())
      console.log('Connection established to:', displayStr);
    });

    this.zChain.peerDiscovery.onDisconnect(async (event) => {
      const connection = event.detail;

      const [_, __, displayStr] = this.getNameAndPeerID(connection.remotePeer.toString())
      console.log('Disconnected from:', displayStr);
    });

    // TODO: check this, this is triggered multiple times for the same peerID
    // this.zChain.peerDiscovery.onDiscover((event: any) => {
    //   const peerInfo = event.detail;

    //   const [_, __, displayStr] = this.getNameAndPeerID(peerInfo.id.toString())
    //   console.log('Discovered:', displayStr);
    // });
  }

  async init(): Promise<void> {
    await this._initModules();

    // initialize meow private ydocs (we don't need libp2p provider for this, as this is private)
    this.meowPrivateYDocs.doc = await this.persistence.getYDoc("meowPrivateYDoc") ?? new Y.Doc();
    this.meowPrivateYDocs.followingZIds = this.meowPrivateYDocs.doc.getMap("followingZIds");
    this.meowPrivateYDocs.followingChannels = this.meowPrivateYDocs.doc.getMap("followingChannels");
    this.persistOnYDocUpdate("meowPrivateYDoc", this.meowPrivateYDocs.doc, this.persistence);

    // initialize meow public ydocs
    this.meowPublicYDocs.doc = await this.initYDoc("meowPublicYDoc");
    this.meowPublicYDocs.networks = this.meowPublicYDocs.doc.getMap("networks");
    this.persistOnYDocUpdate("meowPublicYDoc", this.meowPublicYDocs.doc, this.persistence);

    // load ydocs for each feed (peer you're following)
    for (const key of this.meowPrivateYDocs.followingZIds.keys()) {
      this.yDocs.feeds[key] = {} as any;
      this.yDocs.feeds[key].doc = await this.initYDoc(`${key}.sys.feed`);
      this.yDocs.feeds[key].feedArray = this.yDocs.feeds[key].doc.getArray("feed");
      this.persistOnYDocUpdate(`${key}.sys.feed`, this.yDocs.feeds[key].doc, this.persistence);
    }

    // subscribe again to each channel ("network::channel" (#hashtag)) if you're restarting the node
    for (const key of this.meowPrivateYDocs.followingChannels.keys()) {
      this.zChain.subscribe(key);

      this.channelYDocs[key] = this.channelYDocs[key] ?? {} as any;
      this.channelYDocs[key].doc = await this.initYDoc(key);
      this.channelYDocs[key].feedArray = this.channelYDocs[key].doc.getArray("feed");
      this.persistOnYDocUpdate(key, this.channelYDocs[key].doc, this.persistence);
    }

    // initialize network db with default network + channels
    const networkDoc = this.meowPublicYDocs.networks;
    if (networkDoc.get(DEFAULT_NETWORK) === undefined) {
      const defaultNetworkChannels = [ "#zchain", "#zero", "#random", GENERAL_CHANNEL ];
      await networkDoc.set(DEFAULT_NETWORK, {
        address: "addr",
        signature: "sig",
        channels: defaultNetworkChannels
      });

      // follow each channel from network as well
      for (const c of defaultNetworkChannels) { await this.followChannel(c, DEFAULT_NETWORK); }
    }
  }

  // append to the Followers database (keyvalue) store for the
  // peerId you follow
  async followZId(peerIdOrName: string): Promise<void> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    const data = this.meowPrivateYDocs.followingZIds.get(peerId);
    if (data === undefined) {
      await this.meowPrivateYDocs.followingZIds.set(peerId, 1);

      // initialize private yDoc & feed of the zId you're following(ydoc array)
      this.yDocs.feeds[peerId] = {} as any;
      this.yDocs.feeds[peerId].doc = await this.initYDoc(`${peerId}.sys.feed`);
      this.yDocs.feeds[peerId].feedArray = this.yDocs.feeds[peerId].doc.getArray("feed");
      this.persistOnYDocUpdate(`${peerId}.sys.feed`, this.yDocs.feeds[peerId].doc, this.persistence);

      console.info(chalk.green(`Great! You're now following ${displayStr}`));
    } else {
      console.info(chalk.yellow(`Already following ${displayStr}`));
    }
  }

  async unfollowZId(peerIdOrName: string): Promise<void> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    const data = this.meowPrivateYDocs.followingZIds.get(peerId);
    if (data !== undefined) {
      this.meowPrivateYDocs.followingZIds.delete(peerId);
      console.info(chalk.green(`You've successfully unfollowed ${displayStr}`));
    }

    const feed = this.yDocs.feeds[peerId];
    if (feed && peerId !== this.peerID()) {
      feed.doc.destroy();  // drop the ydoc
      this.yDocs.feeds[peerId] = undefined;
    }
  }

  async getPeerFeed(peerIdOrName: string, n: number): Promise<Object[]> {
    const [peerId, _, displayStr] = this.getNameAndPeerID(peerIdOrName);

    if (peerId !== this.peerID() && this.meowPrivateYDocs.followingZIds.get(peerId) === undefined) {
      console.error(
        chalk.red(`Cannot fetch feed (Invalid request): You're not following ${displayStr}`)
      );
      return [];
    }

    const feed = this.yDocs.feeds[peerId]?.feedArray;
    if (feed === undefined) {
      console.error(
        chalk.red(`Error while loading feed for zId ${displayStr}: not found. The node is possibly offline and feeds are not synced yet.`)
      );
      return [];
    }

    return await this.getMessagesOnFeed(peerId, n);
  }


  // returns peers followed by "this" node
  getFollowedPeers(): Object[] {
    const peers = [];
    for (const key of this.meowPrivateYDocs.followingZIds.keys()) {
      const [peerId, displayName, _] = this.getNameAndPeerID(key);
      peers.push({
        "peerId": peerId,
        "displayName": displayName ?? null
      });
    }

    if (peers.length === 0) {
      console.log(chalk.yellow(`Not following any peer`));
    }

    return peers;
  }


  // returns a list of channels "this" node is following
  getFollowedChannels() {
    const channels = [];
    for (const key of this.meowPrivateYDocs.followingChannels.keys()) {
      channels.push(key);
    }
    return channels;
  }


  private async _assertChannelPresentInNetwork(
    channel: string, network: string): Promise<void> {
    const networkMetaData = await this.getNetworkMetadata(network);
    const channels = networkMetaData["channels"];
    if (!channels.includes(channel)) {
      throw new Error(chalk.red(
        `Channel: ${channel} not present in network ${network}. Use getNetworkMetaData(network) to check list of available channels in that network.`
      ));
    }
  }



  /**
   * Follow a channel (#hashtag). Save public orbitdb address of the channel
   * to the "followingChannels" database
   * @param channel channel to follow
   * @param network name of network where channel is. If not passed default network will be used.
   */
  async followChannel(channel: string, network?: string) {
    if (network === undefined) {
      console.warn(chalk.yellow(`Network name not passed. Using default network ${DEFAULT_NETWORK}`));
      network = DEFAULT_NETWORK;
    }
    await this._assertChannelPresentInNetwork(channel, network);

    // append network name before channel
    channel = `${network}::${channel}`;
    const data = this.meowPrivateYDocs.followingChannels.get(channel);
    if (data === undefined) {
      this.zChain.subscribe(channel);

      // save {"channel": "1"} to followingChannels ydoc
      await this.meowPrivateYDocs.followingChannels.set(channel, "1");

      // initialize channel ydoc of the channel feed (so we start replicating)
      this.channelYDocs[channel] = this.channelYDocs[channel] ?? {} as any;
      this.channelYDocs[channel].doc = await this.initYDoc(channel);
      this.channelYDocs[channel].feedArray = this.channelYDocs[channel].doc.getArray("feed");
      this.persistOnYDocUpdate(channel, this.channelYDocs[channel].doc, this.persistence);

      console.info(chalk.green(`Great! You're now following channel ${channel}`));
    } else {
      console.info(chalk.yellow(`Already following channel ${channel}`));
    }
  }

  /**
   * Unfollow a channel (#hashtag). Remove entry from database, and drop the channel
   * database, if present.
   * @param channel channel to unfollow
   * @param network name of network where channel is. If not passed default network will be used.
   */
  async unFollowChannel(channel: string, network?: string) {
    if (network === undefined) {
      console.warn(chalk.yellow(`Network name not passed. Using default network ${DEFAULT_NETWORK}`));
      network = DEFAULT_NETWORK;
    }
    await this._assertChannelPresentInNetwork(channel, network);

    // append network name before channel
    channel = `${network}::${channel}`;
    const data = this.meowPrivateYDocs.followingChannels.get(channel);
    if (data !== undefined) {
      this.meowPrivateYDocs.followingChannels.delete(channel);
      this.persistence.storeUpdate('meowPrivateYDoc', Y.encodeStateAsUpdate(this.meowPrivateYDocs.doc));

      console.info(chalk.green(`You've successfully unfollowed ${channel}`));
    }

    const channelYDoc = this.channelYDocs[channel]?.doc;
    if (channelYDoc) {
      channelYDoc.destroy(); // drop the ydoc
      this.channelYDocs[channel] = undefined;
    }
  }

  /**
   * Publish a message on a channel. Note: it doesn't matter if "this" node is following
   * this channel or not, we write to the orbitdb on the publishing side of pubsub msg.
   * @param channel channel on which to publish message on
   * @param message message to publish
   * @param channels a "list" of channels this message is being published on. (could be multiple channels)
   * @param network network where the channel belong. If not passed, default network will be used.
   */
  async publishMessageOnChannel(
    channel: string,
    message: string,
    channels: string[],
    network?: string
  ): Promise<void> {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    // append network name before channel
    network = network ?? DEFAULT_NETWORK;
    await this._assertChannelPresentInNetwork(channel, network);
    channel = `${network}::${channel}`;

    let channelFeed: Y.Array<unknown>;
    let dropDB = false;
    if (this.channelYDocs[channel]?.doc) {
      channelFeed = this.channelYDocs[channel].feedArray;
    } else {
      const doc = await this.initYDoc(channel);
      channelFeed = doc.getArray("feed");
      dropDB = true; // since we're not following this channel, we should drop this db, after publish
    }

    await this.appendZChainMessageToFeed(channelFeed, message, channels, network);

    // TODO: think about it more (dropping a db if not following -- the problem is if no
    // other node is online, and we publish & drop the db, the "appended" data is actually LOST)
    //if (dropDB === true) { await db.drop(); }
  }


  /**
   * Lists messages published on a channel.
   * @param channel channel of which to display feed of
   * @param n number of messages (in reverse order) to list
   * @param network name of network where channel is. If not passed default network will be used.
   * @returns
   */
  async getChannelFeed(channel: string, n:number, network?: string): Promise<types.ZChainMessage[]> {
    if (network === undefined) {
      console.warn(chalk.yellow(`Network name not passed. Using default network ${DEFAULT_NETWORK}`));
      network = DEFAULT_NETWORK;
    }
    await this._assertChannelPresentInNetwork(channel, network);

    // append network name before channel
    channel = `${network}::${channel}`;
    if (this.meowPrivateYDocs.followingChannels.get(channel) === undefined) {
      console.error(
        chalk.red(`Cannot fetch feed (Invalid request): You're not following ${channel}`)
      );
      return [];
    }

    const feedArray = this.channelYDocs[channel].feedArray;
    if (feedArray === undefined) {
      console.error(
        chalk.red(`Error while loading feed for ${channel}: NOT FOUND.`)
      );
      return [];
    }

    let messages: any[];
    if (feedArray.length <= n) {
      messages = feedArray.toJSON();
    } else {
      messages = feedArray.slice(feedArray.length - n, feedArray.length);
    }

    const channelFeed = [];
    for (const m of messages) {
      if (m === undefined) { continue; }

      const msg = m as types.ZChainMessage;
      channelFeed.push({
        ...msg,
        message: await decode(msg.message, password)
      });
    }

    return channelFeed.reverse();
  }

  /**
   * Lists all db's with address & no. of entries
   */
  async listDBs(): Promise<void> {
    // const dbs = {};
    // const channelsList = this.meowDbs.followingChannels.all;
    // const followerList = this.meowDbs.followingZIds.all;
    // const addressBook = this.dbs.addressBook.all;

    // dbs["followingZIds"] = {
    //   "address": this.meowDbs.followingZIds.address.toString(),
    //   "entries": Object.entries(followerList).length
    // }

    // dbs["followingChannels"] = {
    //   "address": this.meowDbs.followingChannels.address.toString(),
    //   "entries": Object.entries(channelsList).length
    // }

    // dbs["addressBook"] = {
    //   "address": this.dbs.addressBook.address.toString(),
    //   "entries": Object.entries(addressBook).length
    // }

    // dbs["Peer feeds"] = {};
    // for (const key in followerList) {
    //   const feed = this.dbs.feeds[key];
    //   const remoteAddress = this.meowDbs.followingZIds.get(key);
    //   if (feed && typeof remoteAddress === "string") {
    //     await feed.load();
    //     dbs["Peer feeds"][key] = {
    //       "address": remoteAddress,
    //       "entries": feed.iterator({ limit: -1 }).collect().length
    //     }
    //   }
    // }

    // dbs["Channel feeds"] = {};
    // for (const key in channelsList) {
    //   const channelDB = this.meowDbs.channels[key];
    //   const remoteAddress = this.meowDbs.followingChannels.get(key);
    //   if (channelDB && typeof remoteAddress === "string") {
    //     await channelDB.load();
    //     dbs["Channel feeds"][key] = {
    //       "address": remoteAddress,
    //       "entries": channelDB.iterator({ limit: -1 }).collect().length
    //     }
    //   }
    // }

    // console.log(dbs);
  }

  /**
   * Creates a new network by name.
   */
  async createNetwork(name: string, channels: string[]): Promise<void> {
    const peerMeta = await this.getPeerEthAddressAndSignature(this.peerID()) as types.PeerMeta;
    // if (peerMeta === undefined) {
    //   throw new Error(chalk.red(`No ethereum address and signature found for ${this.peerID()}`));
    // }

    // add validation logic first
    await this.meowPublicYDocs.networks.set(name, {
      address: "<addr>",
      signature: "<sig>",
      channels: channels
    });

    console.log(chalk.green(`Successfully created network ${name}`));
    await this.joinNetwork(name);
  }


  async getNetworkMetadata(networkName: string): Promise<Network | undefined> {
    const networkMetaData = await this.meowPublicYDocs.networks.get(networkName) as Network;
    if (networkMetaData === undefined) {
      throw new Error(chalk.red(`Network ${networkName} not found. Please create a network first`));
    }

    return networkMetaData;
  }

  /**
   * Add a new channel in network.
   */
  async addChannelInNetwork(networkName: string, channel: string): Promise<void> {
    const networkMetaData = await this.getNetworkMetadata(networkName);
    const channels = networkMetaData["channels"];
    for (const c of channels) {
      if (c === channel) {
        console.warn(chalk.yellow(`Channel ${channel} is already present in network ${networkName}. Skipping..`));
        return;
      }
    }

    // add validation logic first
    await this.meowPublicYDocs.networks.set(networkName, {
      ...networkMetaData,
      channels: [ ...channels ].concat([ channel ])
    });

    console.log(chalk.green(`Successfully added Channel:${channel} in network ${networkName}`));
  }

  /**
   * Join a network
   */
  async joinNetwork(networkName: string) {
    const networkMetaData = await this.getNetworkMetadata(networkName);
    // follow each channel in network
    const channels = networkMetaData["channels"];
    for (const c of channels) {
      await this.followChannel(c, networkName);
    }

    console.log(chalk.green(`Successfully joined network ${networkName}`));
  }

  /**
   * Leave a network
   */
  async leaveNetwork(networkName: string) {
    const networkMetaData = await this.getNetworkMetadata(networkName);

    // unfollow each channel in network
    const channels = networkMetaData["channels"];
    for (const c of channels) {
      await this.unFollowChannel(c, networkName);
    }

    console.log(chalk.green(`Successfully left network ${networkName}`));
  }

  /**
   * Returns a list of all networks along with associated channels
   */
  async getNetworkList() {
    const list = [];
    const networks = await this.meowPublicYDocs.networks.toJSON() as { [key: string]: Network };
    for (const key of Object.keys(networks)) {
      list.push({
        "network": key,
        "channels": networks[key]["channels"]
      })
    }

    return list;
  }

  /**
   * Returns a list of all networks "I am following" along with their associated channels
   */
  async getMyNetworks() {
    // followingChannels is in the format of network::channel
    const followingChannels = Object.keys(this.meowPrivateYDocs.followingChannels.toJSON() ?? {});

    const followingNetworksData = {};
    for (const channel of followingChannels) {
      const [n, c] = channel.split("::");
      if (n && c) {
        if (followingNetworksData[n] === undefined) {
          followingNetworksData[n] = {};
          followingNetworksData[n]["channels"] = [];
        }

        (followingNetworksData[n]["channels"] ?? []).push(c);
      }
    }

    const list = [];
    for (const key of Object.keys(followingNetworksData)) {
      list.push({
        "network": key,
        "channels": followingNetworksData[key]["channels"]
      })
    }

    return list;
  }
}



