import { ZCHAIN } from "zchain-core";

import { DB_ADDRESS_PROTOCOL, EVERYTHING_TOPIC, MAX_MESSAGE_LEN, password } from "./constants";
import { pipe } from 'it-pipe';
import { Multiaddr } from 'multiaddr';
import { MStore } from "./storage";

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

  /**
   * Initializes a new Zchain node
   * @param fileName json present in /ids. Contains peer metadata
   * @returns libp2p node instance
   */
  async init (fileName: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initialize(fileName, password, listenAddrs);
    this.store = new MStore(this.zchain);
    await this.store.init();

    this.zchain.peerDiscovery.onConnect(async (connection) => {
      console.log('Connection established to:', connection.remotePeer.toB58String());
      const listenerMa = new Multiaddr(`/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/${connection.remotePeer.toB58String()}`)
      try {
        const { stream } = await this.zchain.node.dialProtocol(listenerMa, DB_ADDRESS_PROTOCOL);

        // share db address on new connection
        const db = this.zchain.zStore.getFeedDB();
        pipe(
          [ db.address.toString() ],
          stream
        );
      } catch (error) {
        // could fail intially because of Mdns <-> webrtc-star
      }
    });

    this.zchain.peerDiscovery.onDiscover((peerId) => {
      console.log('Discovered:', peerId.toB58String());
    });

    await this.store.handleIncomingOrbitDbAddress(this.zchain);

    // listen and subscribe to the everything topic (aka "super" node)
    this.zchain.listen(EVERYTHING_TOPIC);
    this.zchain.subscribe(EVERYTHING_TOPIC);
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
  }

  async followZId(peerId: string) {
    await this.store.followZId(peerId);
  }

  async unFollowZId(peerId: string) {
    await this.store.unFollowZId(peerId);
  }

  async followTopic(topic: string) {
    await this.store.followTopic(topic);
  }

  async unFollowTopic(topic: string) {
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
