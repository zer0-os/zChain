import { RELAY_ADDRS, ZCHAIN } from "zchain-core";

import { APP_KEY, APP_SECRET, DB_ADDRESS_PROTOCOL, EVERYTHING_TOPIC, MAX_MESSAGE_LEN, password, ZERO_TOPIC } from "./lib/constants";
import { pipe } from 'it-pipe';
import { Multiaddr } from 'multiaddr';
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

  // todo: review and remove
  // update: i think for sandbox we can use this logic
  private async _initModules() {
    this.zchain.peerDiscovery.onConnect(async (connection) => {
      const [_, __, displayStr] = this.store.getNameAndPeerID(connection.remotePeer.toB58String())

      console.log('Connection established to:', displayStr);
      const listenerMa = new Multiaddr(`/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/${connection.remotePeer.toB58String()}`)
      try {
        const { stream } = await this.zchain.node.dialProtocol(listenerMa, DB_ADDRESS_PROTOCOL);

        // share db address on new connection
        // TODO: use orbitdb.determineAddress(), not need to "load" db here
        const db = this.zchain.zStore.getFeedDB();
        pipe(
          [ db.address.toString() ],
          stream
        );
      } catch (error) {
        // console.log("E ", error);
        // could fail intially because of Mdns <-> webrtc-star
      }
    });

    this.zchain.peerDiscovery.onDiscover((peerId) => {
      const [_, __, displayStr] = this.store.getNameAndPeerID(peerId.toB58String())
      console.log('Discovered:', displayStr);
    });

    await this.store.handleIncomingOrbitDbAddress(this.zchain);
  }

  async connect(peerAddress: string) {
    //console.log("Trying to connect to :: ", peerAddress);
    const connectedPeers = (await this.zchain.ipfs.swarm.peers()).map(p => p.peer);
    const relayAddresses = RELAY_ADDRS.map(addr => addr.split('/p2p/')[1]);
    if (!(relayAddresses.includes(peerAddress) && connectedPeers.includes(peerAddress))) {
      // try to connect via relay protocol (using all relays), if not connected & is not a relay
      let connected = false;
      for (const relay of RELAY_ADDRS) {
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
   * @param fileName json present in /ids. Contains peer metadata
   * @returns libp2p node instance
   */
  async init (fileNameOrPath?: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initialize(fileNameOrPath, listenAddrs);

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
        if (!(relayAddresses.includes(discoveredPeer.id) && connectedPeers.includes(discoveredPeer.id))) {
          await this.connect(discoveredPeer.id);
        }
      }
    }, 15 * 1000);

    await this._initModules();

    // listen and subscribe to the everything channel (aka "super" node)
    //this.zchain.subscribe(EVERYTHING_TOPIC);
  }

  /**
   * Initializes a new Zchain Daemon (or load an already running one)
   * @param fileName json present in /ids. Contains peer metadata
   * @returns daemon instance
   * // i think we should have initialized zStore here (to log replication/syncing)
   */
  async startDaemon (fileNameOrPath?: string, listenAddrs?: string[]): Promise<Daemon> {
    this.zchain = new ZCHAIN();
    const daemon = await this.zchain.startDaemon(fileNameOrPath, listenAddrs);
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

  async load (): Promise<void> {
    this.zchain = new ZCHAIN();
    await this.zchain.load();

    this.store = new MStore(this.zchain);
    await this.store.init();
  }

  async sendMeow (msg: string, publishOnTwitter: boolean = false): Promise<void> {
    this.zchain = this.assertZChainInitialized();

    // only publish (to twitter) if twitter-config is enabled AND flag is true
    const publishToTwitter = this.twitter && publishOnTwitter === true;

    if (msg.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`);
    }

    // extract hashtags(channels) from the msg
    const hashtags = msg.match(/#[a-z0-9_]+/g) ?? [];

    // publish message on each channel
    // messages published to "#everything" will be listened by only "super node"
    const channels = [ EVERYTHING_TOPIC, ...hashtags];
    if (publishToTwitter === true && !channels.includes(ZERO_TOPIC)) {
      channels.push(ZERO_TOPIC);
    }

    // publish on zchain
    for (const hashtag of channels) {
      await this.zchain.publish(hashtag, msg, channels);
      await this.store.publishMessageOnChannel(hashtag, msg, channels);
    }

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

  async followZId(peerIdOrName: string) {
    await this.store.followZId(peerIdOrName);
  }

  async unfollowZId(peerIdOrName: string) {
    await this.store.unfollowZId(peerIdOrName);
  }

  async followChannel(channel: string) {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    //this.zchain.subscribe(channel);
    await this.store.followChannel(channel);
  }

  async unFollowChannel(channel: string) {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    this.zchain.unsubscribe(channel);
    await this.store.unFollowChannel(channel);
  }

  listFollowedPeers() {
    this.store.listFollowedPeers();
  }

  listFollowedChannels() {
    this.store.listFollowedChannels();
  }

  async displayFeed(peerIdOrName: string, n: number) {
    await this.store.displayFeed(peerIdOrName, n);
  }

  async displayChannelFeed(channel: string, n: number) {
    if (channel[0] !== `#`) { channel = '#' + channel; }

    await this.store.displayChannelFeed(channel, n);
  }

  async listDBs() {
    await this.store.listDBs();
  }

  /**
   * Sets a name of the peerId in the local address book
   * @param peerId peerID
   * @param name name to set
   */
  async set(peerId: string, name: string) {
    await this.store.setNameInAddressBook(peerId, name);
  }

  private _getTwitterConfig() {
    const jsipfsPath = path.join(os.homedir(), '/.jsipfs');
    const twitterConfigPath = path.join(jsipfsPath, 'twitter-config.json');
    if (!fs.existsSync(jsipfsPath)) {
      throw new Error(chalk.red(`No ipfs repo found at ~/.jsipfs. Initialize a node first.`));
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
   * Enables twitter (saves config at ~/.jsipfs/<peerID>/twitter-config.json)
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
          const basePath = path.join(os.homedir(), '/.jsipfs');

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
        path.join(os.homedir(), '/.jsipfs', 'oauth_token_secret'),
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
   * Disables twitter (removes config at ~/.jsipfs/<peerID>/twitter-config.json)
   */
  disableTwitter() {
    const twitterConfig = this._getTwitterConfig();
    if (twitterConfig) {
      fs.rmSync(
        path.join(os.homedir(), '/.jsipfs', 'twitter-config.json'),
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
	meow.disableTwitter()				Disables twitter. Simply removes config at ~/.jsipfs/<peerID>/twitter-config.json

	meow.followZId("<peerIdOrName>")		Follow a peer (by ID or display name)
	meow.unfollowZId("<peerIdOrName>")  		Unfollow a peer (by ID or display name)
	meow.listFollowedPeers()        		Lists all peers followed by this node
	meow.displayFeed("<peerIdOrName>", n) 		Display last "n" messages published by this peer

	meow.followChannel("<channel>")         	Follow a channel (#hashtag)
	meow.unFollowChannel("<channel>")       	Unfollow a channel (#hashtag)
	meow.listFollowedChannels()       		Lists all channels followed by this node
	meow.displayChannelFeed("<channel>", n) 	Display last "n" messages published on a channel
`);
  }
}
