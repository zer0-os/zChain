import { RELAY_ADDRS, ZCHAIN } from "zchain-core";
import { APP_KEY, APP_SECRET, DEFAULT_NETWORK, GENERAL_CHANNEL, MAX_MESSAGE_LEN, ZERO_TOPIC } from "./lib/constants";
import { MStore } from "./lib/storage";
import { Daemon } from 'ipfs-daemon'
import chalk from "chalk";
import delay from "delay";
import fs from "fs";
import open from "open";
import path from 'path';
import os from 'os';
import { Twitter } from "./lib/twitter";
import { TwitterApi } from "twitter-api-v2";
import express from "express";
import { shuffle } from "./lib/array";
import { Network, TwitterAuthLink } from "./types";


export class MEOW {
  zchain: ZCHAIN | undefined;
  store: MStore | undefined;
  twitter: Twitter | undefined;

  constructor () {}

  assertZChainInitialized (): ZCHAIN {
    if (this.zchain === undefined) {
      throw new Error("zchain not initialized");
    }
    return this.zchain;
  }


  private async connect(peerAddress: string) {
    const connectedPeers = (await this.zchain.ipfs.swarm.peers()).map(p => p.peer);
    const relayAddresses = RELAY_ADDRS.map(addr => addr.split('/p2p/')[1]);


    // console.log("relayAddresses ", relayAddresses);

    if (
      relayAddresses.includes(peerAddress) === false &&
      connectedPeers.includes(peerAddress) === false
    ) {
      // try to connect via relay protocol (using all relays), if not connected & is not a relay
      let connected = false;
      const shuffledRelays = shuffle(RELAY_ADDRS);
      for (const relay of shuffledRelays) {
        if (connected === true) { break; }
        const address = `${relay}/p2p-circuit/p2p/${peerAddress}`;
        try {
          await this.zchain.ipfs.swarm.connect(address);
          connected = true;
        } catch (e) {
          //console.log('e ', e);
          // not sure if i follow this :: an abort error is thrown but the connection still goes through
          // console.log(chalk.yellow(`[${peerAddress}]: ${e}`));
        }
      }
    }
  }

  /**
   * Initializes a new Zchain node
   * @param name Name assinged to this node (by the user)
   * @returns libp2p node instance
   */
  async init (zIdName: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initialize(zIdName, listenAddrs);

    this.store = new MStore(this.zchain);
    await this.store.init();

    const twitterConfig = this._getTwitterConfig();
    if (twitterConfig) {
      this.twitter = new Twitter(this.zchain, this.store, twitterConfig);
    }

    /**
     * Logic: In every 10s check the diff b/w all known and connected address. Try to connect
     * to those peers who are known, but not connected (& not a relay).
     */
    const relayAddresses = RELAY_ADDRS.map(addr => addr.split('/p2p/')[1]);
    setInterval(async () => {
      const connectedPeers = (await this.zchain.ipfs.swarm.peers()).map(p => p.peer);
      const discoveredPeers = await this.zchain.ipfs.swarm.addrs();
      for (const discoveredPeer of discoveredPeers) {
        if (relayAddresses.includes(discoveredPeer.id) === false && connectedPeers.includes(discoveredPeer.id) === false) {
          await this.connect(discoveredPeer.id);
        }
      }
    }, 10 * 1000);
  }

  /**
   * Initializes a new Zchain Daemon (or load an already running one)
   * @param name Name assinged to this node (by the user)
   * @returns daemon instance
   * // i think we should have initialized zStore here (to log replication/syncing)
   */
  async startDaemon (zIdName: string, listenAddrs?: string[]): Promise<Daemon> {
    this.zchain = new ZCHAIN();
    const daemon = await this.zchain.startDaemon(zIdName, listenAddrs);
    this.zchain.node.on('peer:discovery', async (peerId) => {
      const peerAddress = peerId.toB58String();
      console.log('Discovered:', peerAddress);

      await delay(3 * 1000); // add delay of 3s after discovery
      await this.connect(peerAddress);
    });

    this.zchain.node.connectionManager.on('peer:connect', async (connection) => {
      console.log(chalk.green(`Connection established to: ${connection.remotePeer.toB58String()}`));
    });

    /**
     * Logic: In every 10s check the diff b/w all known and connected address. Try to connect
     * to those peers who are known, but not connected (& not a relay).
     */
    const relayAddresses = RELAY_ADDRS.map(addr => addr.split('/p2p/')[1]);
    setInterval(async () => {
      const connectedPeers = (await this.zchain.ipfs.swarm.peers()).map(p => p.peer);
      const discoveredPeers = await this.zchain.ipfs.swarm.addrs();
      for (const discoveredPeer of discoveredPeers) {
        if (!(relayAddresses.includes(discoveredPeer.id) && connectedPeers.includes(discoveredPeer.id))) {
          await this.connect(discoveredPeer.id);
        }
      }
    }, 10 * 1000);

    // this logic is to listen to all subscribed channels at the daemon level
    const set = new Set([]);
    setInterval(async () => {
      const list = await this.zchain.ipfs.pubsub.ls();
      for (const l of list) {
        if (l.startsWith('#') && !set.has(l)) {
          this.zchain.subscribe(l);
          set.add(l);
        }
      }
    }, 5 * 1000);

    return daemon;
  }

  async load (name: string): Promise<void> {
    this.zchain = new ZCHAIN();
    await this.zchain.load(name);

    this.store = new MStore(this.zchain);
    await this.store.init();
  }

  async sendMeow (msg: string, publishOnTwitter: boolean = false, network?: string): Promise<void> {
    this.zchain = this.assertZChainInitialized();
    if (network === undefined) {
      console.warn(chalk.yellow(`Network name not passed. Using default network ${DEFAULT_NETWORK}`));
      network = DEFAULT_NETWORK;
    }

    // only publish (to twitter) if twitter-config is enabled AND flag is true
    const publishToTwitter = this.twitter && publishOnTwitter === true;

    if (msg.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`);
    }

    // extract hashtags(channels) from the msg
    const hashtags = msg.match(/#\w+/g) ?? [];
    const lowerCaseHashTags = hashtags.map(h => h.toLowerCase());

    // publish message on each channel
    // messages published to "#everything" will be listened by only "super node"
    const channels = [ ...lowerCaseHashTags];

    // publish on zchain (for channels present in network)
    for (const hashtag of channels) {
      await this.zchain.publish(`${network}::${hashtag}`, msg, channels);
      await this.store.publishMessageOnChannel(hashtag, msg, channels, network);
    }

    /* publish on zchain (for individual channels) COMMENTED for now

    const individualChannels = [ EVERYTHING_TOPIC ];
    if (publishToTwitter === true && !channels.includes(ZERO_TOPIC)) {
      individualChannels.push(ZERO_TOPIC);
    }

    for (const hashtag of individualChannels) {
      await this.zchain.publish(hashtag, msg, individualChannels);
      await this.store.publishMessageOnChannel(hashtag, msg, individualChannels);
    }
    */

    console.log(chalk.green('Sent on zchain!'));

    // publish on twitter
    if (publishToTwitter === true) {
      // add #zero hashtag!
      if (!hashtags.includes(ZERO_TOPIC)) {
        msg = msg.concat(` ${ZERO_TOPIC}`);
      }

      await this.twitter.tweet(msg);
    }
  }

  /**
   * Send a message on a channel, in a network
   * @param message message string (must be less than 280 char)
   * @param channel channel name
   * @param network network name
   */
  async sendMessage (message: string, channel: string, network?: string): Promise<void> {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    channel = channel.toLowerCase();

    this.zchain = this.assertZChainInitialized();
    if (network === undefined) {
      console.warn(chalk.yellow(`Network name not passed. Using default network ${DEFAULT_NETWORK}`));
      network = DEFAULT_NETWORK;
    }

    if (message.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`);
    }

    // add message to local feed + store in topic orbit-db
    await this.zchain.publish(`${network}::${channel}`, message, [channel]);
    await this.store.publishMessageOnChannel(channel, message, [channel], network);

    console.log(chalk.green('Sent on zchain!'));
  }

  async followZId(peerIdOrName: string) {
    await this.store.followZId(peerIdOrName);
  }

  async unfollowZId(peerIdOrName: string) {
    await this.store.unfollowZId(peerIdOrName);
  }

  async followChannel(channel: string, network?: string) {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    channel = channel.toLowerCase();

    await this.store.followChannel(channel, network);
  }

  async unFollowChannel(channel: string, network?: string) {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    channel = channel.toLowerCase();

    this.zchain.unsubscribe(channel);
    await this.store.unFollowChannel(channel, network);
  }

  getFollowedPeers() {
    return this.store.getFollowedPeers();
  }

  getFollowedChannels() {
    return this.store.getFollowedChannels();
  }

  async getPeerFeed(peerIdOrName: string, n: number) {
    return await this.store.getPeerFeed(peerIdOrName, n);
  }

  async getChannelFeed(channel: string, n: number, network?: string) {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    channel = channel.toLowerCase();

    return await this.store.getChannelFeed(channel, n, network);
  }

  async listDBs() {
    await this.store.listDBs();
  }

  /**
   * Sets a name of the peerId in the local address book
   * @param peerId peerID
   * @param name name to set
   */
  async setDisplayName(peerId: string, name: string, force: boolean = false) {
    await this.store.setNameInAddressBook(peerId, name, force);
  }

  private _getTwitterConfig() {
    const zChainPath = path.join(os.homedir(), '/.zchain');
    const twitterConfigPath = path.join(zChainPath, 'twitter-config.json');
    if (!fs.existsSync(zChainPath)) {
      throw new Error(chalk.red(`No zchain config found at ~/.zchain. Please initialize a node first.`));
    }

    if (fs.existsSync(twitterConfigPath)) {
      const twitterConfig = fs.readFileSync(
        twitterConfigPath, "utf8"
      );
      return JSON.parse(twitterConfig);
    }

    return undefined;
  }

  /**
   * Enables twitter (saves config at ~/.zchain/twitter-config.json)
   */
  async enableTwitter(force: Boolean = false) {
    const twitterConfig = this._getTwitterConfig();

    if (!twitterConfig || force === true) {
      console.log(chalk.yellow(`
Twitter config not found.
Please authorize the meow application to access your twitter account.`
));

      try {
        // server is ONLY used for twitter callback
        const app = express()
        const port = 3000

        app.listen(port, () => {
          console.log(`Listening on port ${port}`)
        });

        // callback route (after use authorizes your app)
        const self = this;
        app.get('/callback', async function (req, res) {
          const basePath = path.join(os.homedir(), '/.zchain');

          // Extract tokens from query string
          const { oauth_token, oauth_verifier } = req.query;
          const oauth_token_secret = fs.readFileSync(
            path.join(basePath, 'oauth_token_secret'),
            'utf-8'
          );

          if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
            return res.status(400).send('You denied the app or your session expired!');
          }

          // Obtain the persistent tokens
          // Create a client from temporary tokens
          const client = new (TwitterApi as any)({
            appKey: APP_KEY,
            appSecret: APP_SECRET,
            accessToken: oauth_token,
            accessSecret: oauth_token_secret,
          });

          const { client: loggedClient, accessToken, accessSecret } = await client.login(oauth_verifier as string);
          const config = {
            "appKey": APP_KEY,
            "appSecret": APP_SECRET,
            "accessToken": accessToken,
            "accessSecret": accessSecret
          }

          // save persistant tokens in config
          fs.writeFileSync(
            path.join(basePath, 'twitter-config.json'),
            JSON.stringify(config, null, 2)
          );

          self.twitter = new Twitter(self.zchain, self.store, config);
          res.send('Twitter integration with zChain successful. You can close this window.');
          return 0; // type hack
        })
      } catch (error) {
        //console.log("EEEEEEEE ", error);
      }

      // generate authlink URL
      const authClient = new TwitterApi({
        appKey: APP_KEY,
        appSecret: APP_SECRET,
      });
      const authLink = await authClient.generateAuthLink(`http://localhost:3000/callback`, { linkMode: 'authorize' });

      // save `oauth_token_secret` locally (ideally it should be saved in req.session)
      fs.writeFileSync(
        path.join(os.homedir(), '/.zchain', 'oauth_token_secret'),
        authLink.oauth_token_secret
      );

      // open auth link now, which falls back to the callback url
      await open(authLink.url);
      return;
    } else {
      console.log(chalk.yellow(`Twitter is already enabled. Exiting..\n`));
    }
  }

  /**
   * Returns a generated auth link, oauth_token & oauth_token_secret
   * using which user authenticats his/her twitter account
   */
  async getTwitterAuthLink(): Promise<TwitterAuthLink> {
    const authClient = new TwitterApi({
      appKey: APP_KEY,
      appSecret: APP_SECRET,
    });
    const authLink = await authClient.generateAuthLink('oob', { linkMode: 'authorize' });
    return authLink;
  }

  /**
   * Login/enable twitter using the PIN, and the temporary outh tokens
   */
  async enableTwitterUsingPIN(authLink: TwitterAuthLink, pin: number, force: Boolean = false) {
    const twitterConfig = this._getTwitterConfig();
    if (!twitterConfig || force === true) {
      const client = new TwitterApi({
        appKey: APP_KEY,
        appSecret: APP_SECRET,
        accessToken: authLink.oauth_token,
        accessSecret: authLink.oauth_token_secret,
      });

      const { client: loggedClient, accessToken, accessSecret } = await client.login(String(pin));
      const config = {
        "appKey": APP_KEY,
        "appSecret": APP_SECRET,
        "accessToken": accessToken,
        "accessSecret": accessSecret
      }

      // save persistant tokens in config
      fs.writeFileSync(
        path.join(os.homedir(), '/.zchain', 'twitter-config.json'),
        JSON.stringify(config, null, 2)
      );

      this.twitter = new Twitter(this.zchain, this.store, config);
      console.log(chalk.green('Successfully set twitter config and initialized client'));
      return;
    } else {
      console.log(chalk.yellow(`Twitter config is already present. Exiting..\n`));
    }
  }

  /**
   * Disables twitter (removes config at ~/.zchain/twitter-config.json)
   */
  disableTwitter() {
    const twitterConfig = this._getTwitterConfig();
    if (twitterConfig) {
      fs.rmSync(
        path.join(os.homedir(), '/.zchain', 'twitter-config.json'),
      );
      this.twitter = undefined;
      console.log(chalk.green('Disabled Twitter'));
    } else {
      console.log(chalk.yellow('Twitter is already disabled'));
    }
  }


  help() {
    console.log(`
Avalilable functions:
	meow.listDBs()					Lists all databases and entries
	meow.sendMeow("<msg>")				Sends a message accross all #hastags (channels)
	meow.set("<peerID>", "<name>")			Sets a display name for a peerID. Saved in local address book.
	meow.enableTwitter("<force: boolean>")		Enable twitter (asks for a PIN after authorization)
	meow.disableTwitter()				Disables twitter. Simply removes config at ~/.zchain/twitter-config.json

	meow.followZId("<peerIdOrName>")		Follow a peer (by ID or display name)
	meow.unfollowZId("<peerIdOrName>")  		Unfollow a peer (by ID or display name)
	meow.getFollowedPeers()        			Lists all peers followed by this node
	meow.getPeerFeed("<peerIdOrName>", n) 		Display last "n" messages published by this peer

	meow.followChannel("<channel>")         	Follow a channel (#hashtag)
	meow.unFollowChannel("<channel>")       	Unfollow a channel (#hashtag)
	meow.getFollowedChannels()       		Lists all channels followed by this node
	meow.getChannelFeed("<channel>", n) 		Display last "n" messages published on a channel
`);
  }

  /*******   Network API's   ********/

  /**
   * Creates a new network by name. But have a valid zNA + address
   * @param name name of network. eg. 0://wilder.team
   * @param channels list of initial channels
   */
  async createNetwork(name: string, channels: string[]) {
    const parsedChannels = [];
    for (let c of channels) {
      if (c[0] !== `#`) { c = '#' + c; }
      c = c.toLowerCase();

      parsedChannels.push(c);
    }

    // add #general channel by default
    parsedChannels.push(GENERAL_CHANNEL);
    await this.store.createNetwork(name, [...new Set(parsedChannels)]);
  }

  /**
   * Returns network metadata {address, sig, channels}
   * @param networkName
   */
  async getNetworkMetadata(networkName: string): Promise<Network | undefined> {
    return await this.store.getNetworkMetadata(networkName);
  }

  /**
   * Add a new channel in network.
   * @param networkName name of network. eg. 0://wilder.team
   * @param channel channel to add
   */
  async addChannelInNetwork(networkName: string, channel: string): Promise<void> {
    if (channel[0] !== `#`) { channel = '#' + channel; }
    channel = channel.toLowerCase();

    await this.store.addChannelInNetwork(networkName, channel);
  }

  /**
   * Join a network. Automatically subscribe to all channels present in the network.
   */
  async joinNetwork(networkName: string) {
    await this.store.joinNetwork(networkName);
  }

  /**
   * Leave a network. Automatically unsubscribe from all channels present in the network.
   */
  async leaveNetwork(networkName: string) {
    await this.store.leaveNetwork(networkName);
  }

  /**
   * Returns a list of all networks along with associated channels
   */
  async getNetworkList() {
    return await this.store.getNetworkList();
  }

  /**
   * Returns a list of all networks "I am following" along with their associated channels
   */
  async getMyNetworks() {
    return await this.store.getMyNetworks();
  }
}
