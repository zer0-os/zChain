import { PubSub } from "@libp2p/interface-pubsub";
import {Libp2p as ILibp2p} from "libp2p";
import { fromString } from "uint8arrays/from-string";
import {PeerId} from "@libp2p/interface-peer-id";

/**
 * Class to Handle gossip functionalites of the p2p chat app
 * eg. subscribe/unsubscribe to topic 
 */
export class Gossip {
  private peerId: PeerId
  private pubsub: PubSub;

  constructor (node: ILibp2p) {
    this.peerId = node.peerId;
    this.pubsub = node.pubsub;
  }

  subscribe (channel: string): void {
    if (!this.pubsub) {
      throw new Error('pubsub has not been configured');
    }
    this.pubsub.subscribe(channel);
    console.log(this.peerId.toString() + " has subscribed to: " + channel);
  }

  unsubscribe (channel: string): void {
    if (!this.pubsub) {
      throw new Error('pubsub has not been configured');
    }

    this.pubsub.unsubscribe(channel);
    console.log(this.peerId.toString() + " has unsubscribed from: " + channel);
  }

  async publish (channel: string, msg: string, channels: string[]): Promise<void> {
    await this.pubsub
      .publish(channel, fromString(msg))
      .catch(err => { throw new Error(err); });
  }
}
