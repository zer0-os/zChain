import { ZCHAIN } from "zchain";
import { DEFAULT_TOPIC, MAX_MESSAGE_LEN } from "./constants";

export class MEOW {
  private zchain: ZCHAIN | undefined;
  private topics: string[];

  constructor() { this.topics = [ DEFAULT_TOPIC ]; }

  assertZChainInitialized(): ZCHAIN {
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
  async init(fileName: string, listenAddrs?: string[]): Promise<void> {
    if (this.zchain !== undefined) { throw new Error('zchain already associated'); }

    this.zchain = new ZCHAIN();
    await this.zchain.initialize(fileName, listenAddrs);

    this.zchain.peerDiscovery!.onConnect((connection) => {
      if (connection.remotePeer.toB58String() === 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv') {
        console.log('Connection established to:', connection.remotePeer.toB58String());
      }
    });

    this.zchain.peerDiscovery!.onDiscover((peerId) => {
      if (peerId.toB58String() === 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv') {
        console.log('Discovered:', peerId.toB58String());
      }
    });

    // listen and subscribe to the default topic: #meow
    this.zchain.listen(DEFAULT_TOPIC);
    this.zchain.subscribe(DEFAULT_TOPIC);
  }

  tweet(msg: string) {
    this.zchain = this.assertZChainInitialized();

    if (msg.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`)
    }

    // extract hashtags(topics) from the msg
    const hashtags = msg.match(/#[a-z0-9_]+/g) ?? [];

    // publish message
    this.zchain.publish(DEFAULT_TOPIC, msg);
    for (const hashtag of hashtags) {
      this.zchain.publish(hashtag, msg);
    }
  }
}