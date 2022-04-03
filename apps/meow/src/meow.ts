import { isDaemonOn, ZCHAIN } from "zchain-core";

import { DB_ADDRESS_PROTOCOL, EVERYTHING_TOPIC, MAX_MESSAGE_LEN, password } from "./lib/constants";
import { pipe } from 'it-pipe';
import { Multiaddr } from 'multiaddr';
import { MStore } from "./lib/storage";
import { Daemon } from 'ipfs-daemon'
import chalk from "chalk";

export class MEOW {
  zchain: ZCHAIN | undefined;
  private readonly topics: string[];
  private store: MStore | undefined;

  constructor () { this.topics = [EVERYTHING_TOPIC]; }

  assertZChainInitialized (): ZCHAIN {
    if (this.zchain === undefined) {
      throw new Error("zchain not initialized");
    }
    return this.zchain;
  }

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
        console.log("E ", error);
        // could fail intially because of Mdns <-> webrtc-star
      }
    });

    this.zchain.peerDiscovery.onDiscover((peerId) => {
      console.log('Discovered:', peerId.toB58String());
    });

    await this.store.handleIncomingOrbitDbAddress(this.zchain);
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
    //await this._initModules();

    this.zchain.node.on('peer:discovery', async (peerId) => {
      //console.log('D ');
      console.log('Discovered????:', peerId.toB58String());
    });

    this.zchain.node.connectionManager.on('peer:connect', async (connection) => {
      if (connection.remotePeer.toB58String() === 'QmQs78HfLpKDKBDL3fLMcCjQTBSXnxuvEYs9V6naVwpRa3') {
        console.log('\n\nFOUND n3o  n3o  n3o  n3o  n3o  n3o  n3o  n3o  n3o  n3o  n3o  n3o \n\n');
      }

      if (connection.remotePeer.toB58String() === 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv') {
        console.log('\n\nFOUND ratik  ratik  ratik  ratik  ratik  ratik  ratik  ratik  ratik  \n\n');
      }

      console.log('C ', connection.remotePeer.toB58String());
    });

    // listen and subscribe to the everything topic (aka "super" node)
    //this.zchain.subscribe(EVERYTHING_TOPIC);
  }

  // meow CLI functions (for testing)
  async initCLI (fileNameOrPath: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initCLI(fileNameOrPath, listenAddrs);
  }

  // meow CLI functions (for testing)
  async loadCLI (path: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.loadCLI(path, password, listenAddrs);

    this.store = new MStore(this.zchain);
    await this.store.init();
    await this._initModules();

    // // listen and subscribe to the everything topic (aka "super" node)
    // this.zchain.subscribe(EVERYTHING_TOPIC);
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

    // listen and subscribe to the everything topic (aka "super" node)
    //this.zchain.subscribe(EVERYTHING_TOPIC);

    this.store = new MStore(this.zchain);
    await this.store.init();
    //await this._initModules();

    console.log('enabled hooks');

    this.zchain.node.on('peer:discovery', (peerId) => {
      console.log('Discovered????:', peerId.toB58String());
    });

    this.zchain.node.connectionManager.on('peer:connect', async (connection) => {
      console.log('Connection established to:', connection.remotePeer.toB58String());
    });


    return daemon;
  }

  async load (): Promise<void> {
    this.zchain = new ZCHAIN();
    await this.zchain.load();

    await this.zchain.node.start();

    this.store = new MStore(this.zchain);
    await this.store.init();
    await this._initModules();


    // this.zchain.node.connectionManager.on('peer:connect', async (connection) => {
    //   console.log('Connection established to:', connection.remotePeer.toB58String());
    // });

    // this.zchain.node.on('peer:discovery', (peerId) => {
    //   console.log('Discovered:', peerId.toB58String());
    // });


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

  async followZId(peerId: string) {
    await this.store.followZId(peerId);
  }

  async unFollowZId(peerId: string) {
    await this.store.unFollowZId(peerId);
  }

  async followTopic(topic: string) {
    this.zchain.subscribe(topic);
    await this.store.followTopic(topic);
  }

  async unFollowTopic(topic: string) {
    this.zchain.unsubscribe(topic);
    await this.store.unFollowTopic(topic);
  }

  listFollowedPeers() {
    this.store.listFollowedPeers();
  }

  listFollowedTopics() {
    this.store.listFollowedTopics();
  }

  async displayFeed(peerId: string, n: number) {
    await this.store.displayFeed(peerId, n);
  }

  async displayTopicFeed(topic: string, n: number) {
    await this.store.displayTopicFeed(topic, n);
  }
}
