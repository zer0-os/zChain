import { createLibp2p } from "libp2p";
import { Libp2p as ILibp2p } from "libp2p";

import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { KadDHT } from '@libp2p/kad-dht'
import { Bootstrap } from '@libp2p/bootstrap'
import { MulticastDNS } from '@libp2p/mdns'
import { WebRTCStar } from "@libp2p/webrtc-star";
import { WebSockets } from '@libp2p/websockets'
import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import wrtc from "@koush/wrtc";
import { FaultTolerance } from 'libp2p/transport-manager'

import { PubSubMessage } from "../types.js";
import { PeerDiscovery } from "./peer-discovery.js";
import { ZStore } from './storage.js';
import { addWebRTCStarAddrs } from "./transport.js";
import { ZID } from "./zid.js";
import chalk from 'chalk';
import { DB_PATH, RELAY_ADDRS, ZID_PATH } from './constants.js';
import fs from "fs";
import { Analytics } from './analytics.js';

export const password = "ratikjindal@3445"

export class ZCHAIN {
    node: ILibp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;
    analytics: Analytics;

    constructor() { 
      this.analytics = new Analytics(); 
      this.analytics.status = true; // ON by default, but use can turn it off

      console.log("Analytics ON (default)");
    }

    async _getLibp2pOptions(listenAddrs?: string[]): Promise<any> {
      const peerId = this.zId.peerId;

      listenAddrs = listenAddrs ?? [];
      const transportKey = WebRTCStar.prototype[Symbol.toStringTag]
      const options = {
        peerId,
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0',
            //'/ip4/0.0.0.0/tcp/0/ws',
            // // custom deployed webrtc-star signalling server
            '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
            '/dns4/sheltered-mountain-08581.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
            ...listenAddrs
          ]
        },
        addressManager: {
          autoDial: true
        },
        connectionManager: {
          autoDial: true,
          dialTimeout: 60000
        },
        transportManager: {
          faultTolerance: FaultTolerance.NO_FATAL
        },
        transports: [
          new WebRTCStar({ wrtc: wrtc }), new WebSockets(), new TCP()
        ],
        streamMuxers: [
          new Mplex({
            maxInboundStreams: Infinity,
            maxOutboundStreams: Infinity
          })
        ],
        peerDiscovery: [
          new MulticastDNS({
            interval: 1000
          }),
          // new Bootstrap({
          //   list: RELAY_ADDRS
          // })
        ],
        connectionEncryption: [
          new Noise()
        ],
        dht: new KadDHT(),
        pubsub: new GossipSub({
          allowPublishToZeroPeers: true,
          emitSelf: true,
          enabled: true
        }),
        config: {
          pubsub: {
            emitSelf: true,
            enabled: false
          },
          transport: {
            [transportKey]: {
              wrtc // You can use `wrtc` when running in Node.js
            }
          }
        }
      };

      // add webrtc-transport if listen addresses has "p2p-webrtc-star"
      // const starAddresses = options.addresses.listen.filter(a => a.includes('p2p-webrtc-star'));
      // if (starAddresses.length) { addWebRTCStarAddrs(options); }
      return options;
    }

    /**
     * Initializes a new (local) Zchain node
     * @param name Name assinged to this node (by the user)
     * @returns libp2p node instance
     */
    async initialize (name: string, listenAddrs?: string[]): Promise<ILibp2p> {
      fs.mkdirSync(ZID_PATH, { recursive: true });
      fs.mkdirSync(DB_PATH, { recursive: true });

      this.zId = new ZID();
      await this.zId.createFromName(name); // get existing/create new peer id
      const libp2pOptions = await this._getLibp2pOptions(listenAddrs);

      this.node = await createLibp2p(libp2pOptions);

      // temporary fix to enable webrtc-star discovery and connections 
      // https://discuss.libp2p.io/t/cant-discover-peers-with-webrtc-star-on-js-libp2p-0-37-0/1438
      (this.node as any).components.getTransportManager().transports.get("@libp2p/webrtc-star").discovery.addEventListener('peer', evt => {
        (this.node as any).onDiscoveryPeer(evt);
      });

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.node);
      this.peerDiscovery.addBootstrapNodes(RELAY_ADDRS);

      await this.node.start();
      await (this.node as any).components.getTransportManager().transports.get("@libp2p/webrtc-star").discovery.start();

      console.log("\n★ ", chalk.cyan('zChain Node Activated: ' + this.node.peerId.toString()) + " ★\n");
    
      // intialize zstore
      this.zStore = new ZStore(this.node, password);
      await this.zStore.init(this.zId.name);

      this._listen(); // listen to pubsub events
      return this.node;
    }

    private _listen (): void {
      this.node.pubsub.addEventListener('message', async (event) => {
        const [_, __, displayStr] = this.zStore.getNameAndPeerID((event.detail as any).from.toString());

        if (event.detail.topic.includes(`/zero-os/gossipPad/`)) {
          // y-libp2p protocol strings (changes, stateVector, awareness). Check packages/y-libp2p
        } else {
          console.log(`Received from ${displayStr} on channel ${event.detail.topic}: ${uint8ArrayToString(event.detail.data)}`);
        }
      });
    }

    subscribe (channel: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }
      this.node.pubsub.subscribe(channel);
      console.log(this.zId.peerId.toString() + " has subscribed to: " + channel);
    }

    unsubscribe (channel: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.node.pubsub.unsubscribe(channel);
      console.log(this.zId.peerId.toString() + " has unsubscribed from: " + channel);
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
        this.zId, msg, 
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
