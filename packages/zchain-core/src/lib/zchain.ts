import { NOISE } from '@chainsafe/libp2p-noise';
import Libp2p from "libp2p";
import Gossipsub from "libp2p-gossipsub";
import KadDHT from 'libp2p-kad-dht';
import Mplex from "libp2p-mplex";
import TCP from 'libp2p-tcp';
import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

import { PubSubMessage } from "../types";
import { PeerDiscovery } from "./peer-discovery";
import { ZStore } from './storage';
import { addWebRTCStarAddrs } from "./transport";
import { ZID } from "./zid";
import chalk from 'chalk';
import { DB_PATH, RELAY_ADDRS, ZID_PATH } from './constants';
import fs from "fs";
import WebSocket from 'libp2p-websockets'
import { Analytics } from './analytics';

export const password = "ratikjindal@3445"

export class ZCHAIN {
    node: Libp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;
    analytics: Analytics;

    constructor() { 
      this.analytics = new Analytics(); 
      this.analytics.status = true; // ON by default, but use can turn it off

      console.log("Analytics ON (default)");
    }

    async _getLibp2pOptions(listenAddrs?: string[]) {
      const peerId = this.zId.peerId;

      listenAddrs = listenAddrs ?? [];
      const options = {
        peerId,
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0/ws',
            // custom deployed webrtc-star signalling server
            '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/sheltered-mountain-08581.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
            ...listenAddrs
          ]
        },
        modules: {
          transport: [TCP, WebSocket],
          streamMuxer: [Mplex],
          connEncryption: [NOISE],
          dht: KadDHT,
          pubsub: Gossipsub,
          peerDiscovery: [] // TODO: add Mdns, removed as tested on remote systems
        },
        config: {
          dht: {
            enabled: false
          },
          pubsub: {
            enabled: true,
            // uncomment to enable publishing node to listen to it's "own" message
            emitSelf: true
          }
        }
      };

      // add webrtc-transport if listen addresses has "p2p-webrtc-star"
      const starAddresses = options.addresses.listen.filter(a => a.includes('p2p-webrtc-star'));
      if (starAddresses.length) { addWebRTCStarAddrs(options); }
      return options;
    }

    /**
     * Initializes a new (local) Zchain node
     * @param name Name assinged to this node (by the user)
     * @returns libp2p node instance
     */
    async initialize (name: string, listenAddrs?: string[]): Promise<Libp2p> {
      fs.mkdirSync(ZID_PATH, { recursive: true });
      fs.mkdirSync(DB_PATH, { recursive: true });

      this.zId = new ZID();
      await this.zId.createFromName(name); // get existing/create new peer id
      const libp2pOptions = await this._getLibp2pOptions(listenAddrs);

      this.node = await Libp2p.create(libp2pOptions);

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.node);
      this.peerDiscovery.addBootstrapNodes(RELAY_ADDRS);

      await this.node.start();
      console.log("\n★ ", chalk.cyan('zChain Node Activated: ' + this.node.peerId.toB58String()) + " ★\n");

      // intialize zstore
      this.zStore = new ZStore(this.node, password);
      await this.zStore.init(this.zId.name);

      return this.node;
    }

    private _listen (channel: string): void {
      this.node.pubsub.on(channel, async (msg: PubSubMessage) => {
        const [_, __, displayStr] = this.zStore.getNameAndPeerID(msg.from);
        console.log(`Received from ${displayStr} on channel ${channel}: ${uint8ArrayToString(msg.data)}`);
      });
    }

    subscribe (channel: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }
      this.node.pubsub.subscribe(channel);
      this._listen(channel);
      console.log(this.zId.peerId.toB58String() + " has subscribed to: " + channel);
    }

    unsubscribe (channel: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.node.pubsub.unsubscribe(channel);
      console.log(this.zId.peerId.toB58String() + " has unsubscribed from: " + channel);
    }

    async publish (channel: string, msg: string, channels: string[]): Promise<void> {
      await this.node.pubsub
        .publish(channel, fromString(msg))
        .catch(err => { throw new Error(err); });

      // if channel includes a network::channel, split and pass separately.
      // this is done to keep zchain independent of networks. Only add network
      // if it's been passed from top(eg. meow app)
      let network: string, baseChannel: string;
      if (channel.includes('::')) {
        network = channel.split('::')[0];
        baseChannel = channel.split('::')[1];
      }
      
      await this.analytics.pipeDataToCentralServer(
        this.zId.peerId.toB58String(), msg, 
        baseChannel ?? channel, network
      );
      await this.zStore.handlePublish(msg, channels, network);
    }

    analyticsOFF() {
      this.analytics.status = false;
      console.log('done!');
    }

    analyticsON() {
      this.analytics.status = true;
      console.log('done!');
    }
}
