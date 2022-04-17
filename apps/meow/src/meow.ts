import { isDaemonOn, RELAY_ADDRS, ZCHAIN } from "zchain-core";

import { DB_ADDRESS_PROTOCOL, EVERYTHING_TOPIC, MAX_MESSAGE_LEN, password } from "./lib/constants";
import { pipe } from 'it-pipe';
import { Multiaddr } from 'multiaddr';
import { MStore } from "./lib/storage";
import { Daemon } from 'ipfs-daemon'
import chalk from "chalk";
import delay from "delay";

export class MEOW {
  zchain: ZCHAIN | undefined;
  private readonly topics: string[];
  store: MStore | undefined;

  constructor () { this.topics = [EVERYTHING_TOPIC]; }

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
      console.log('Connection established to:', connection.remotePeer.toB58String());
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
      console.log('Discovered:', peerId.toB58String());
    });

    await this.store.handleIncomingOrbitDbAddress(this.zchain);
  }

  async connect(peerAddress: string) {
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
  async init (fileNameOrPath: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initialize(fileNameOrPath, password, listenAddrs);

    this.store = new MStore(this.zchain);
    await this.store.init();

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

    await this._initModules();

    // listen and subscribe to the everything topic (aka "super" node)
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

    // this logic is to listen to all subscribed topics at the daemon level
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

  async sendMeow (msg: string): Promise<void> {
    this.zchain = this.assertZChainInitialized();

    if (msg.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`);
    }

    // extract hashtags(topics) from the msg
    const hashtags = msg.match(/#[a-z0-9_]+/g) ?? [];

    // publish message on each topic
    // messages published to "#everything" will be listened by only "super node"
    for (const hashtag of [ EVERYTHING_TOPIC, ...hashtags]) {
      await this.zchain.publish(hashtag, msg);
      await this.store.publishMessageOnTopic(hashtag, msg);
    }

    console.log(chalk.green('Sent!'));
  }

  async followZId(peerIdOrName: string) {
    await this.store.followZId(peerIdOrName);
  }

  async unfollowZId(peerIdOrName: string) {
    await this.store.unfollowZId(peerIdOrName);
  }

  async followTopic(topic: string) {
    if (topic[0] !== `#`) { topic = '#' + topic; }

    this.zchain.subscribe(topic);
    await this.store.followTopic(topic);
  }

  async unFollowTopic(topic: string) {
    if (topic[0] !== `#`) { topic = '#' + topic; }

    this.zchain.unsubscribe(topic);
    await this.store.unFollowTopic(topic);
  }

  listFollowedPeers() {
    this.store.listFollowedPeers();
  }

  listFollowedTopics() {
    this.store.listFollowedTopics();
  }

  async displayFeed(peerIdOrName: string, n: number) {
    await this.store.displayFeed(peerIdOrName, n);
  }

  async displayTopicFeed(topic: string, n: number) {
    if (topic[0] !== `#`) { topic = '#' + topic; }

    await this.store.displayTopicFeed(topic, n);
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

  help() {
    console.log(`
Avalilable functions:
	meow.listDBs()				Lists all databases and entries
	meow.sendMeow(msg)			Sends a message accross all #hastags (channels)
	meow.set(peerID, name)			Sets a display name for a peerID. Saved in local address book.

	meow.followZId(peerIdOrName)		Follow a peer (by ID or display name)
	meow.unfollowZId(peerIdOrName)  	Unfollow a peer (by ID or display name)
	meow.listFollowedPeers()        	Lists all peers followed by this node
	meow.displayFeed(peerIdOrName, n) 	Display last "n" messages published by this peer

	meow.followTopic(topic)         	Follow a topic (#hashtag)
	meow.unFollowTopic(topic)       	Unfollow a topic (#hashtag)
	meow.listFollowedTopics()       	Lists all topics followed by this node
	meow.displayTopicFeed(topic, n) 	Display last "n" messages published on a topic
`);
  }
}
