import { ZCHAIN } from "zchain-core";

import { EVERYTHING_TOPIC, MAX_MESSAGE_LEN, password } from "./constants";

export class MEOW {
  private zchain: ZCHAIN | undefined;
  private readonly topics: string[];

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

    this.zchain.peerDiscovery.onConnect((connection) => {
      console.log('Connection established to:', connection.remotePeer.toB58String());
    });

    this.zchain.peerDiscovery.onDiscover((peerId) => {
      console.log('Discovered:', peerId.toB58String());
    });

    // listen and subscribe to the everything topic (aka "super" node)
    this.zchain.listen(EVERYTHING_TOPIC);
    this.zchain.subscribe(EVERYTHING_TOPIC);
  }

  sendMeow (msg: string): void {
    this.zchain = this.assertZChainInitialized();

    if (msg.length > MAX_MESSAGE_LEN) {
      throw new Error(`Length of a message exceeds maximum length of ${MAX_MESSAGE_LEN}`);
    }

    // extract hashtags(topics) from the msg
    const hashtags = msg.match(/#[a-z0-9_]+/g) ?? [];

    // publish message
    this.zchain.publish(EVERYTHING_TOPIC, msg); // this will be "listened by only super node"
    for (const hashtag of hashtags) {
      this.zchain.publish(hashtag, msg);
    }
  }
}
