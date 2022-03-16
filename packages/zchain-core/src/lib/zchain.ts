import { NOISE } from '@chainsafe/libp2p-noise';
import Libp2p from "libp2p";
import { IPFS as IIPFS } from 'ipfs-core';
import * as IPFS from 'ipfs-core';

import Gossipsub from "libp2p-gossipsub";
import KadDHT from 'libp2p-kad-dht';
import Mdns from "libp2p-mdns";
import Mplex from "libp2p-mplex";
import TCP from 'libp2p-tcp';
import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

import { PubSubMessage } from "../types";
import { PeerDiscovery } from "./peer-discovery";
import { ZStore } from './storage';
import { addWebRTCStarAddrs } from "./transport";
import { ZID } from "./zid";

export class ZCHAIN {
    ipfs: IIPFS | undefined;
    node: Libp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;

    /**
     * Initializes a new Zchain node
     * @param fileName json present in /ids. Contains peer metadata
     * @returns libp2p node instance
     */
    async initialize (fileName: string, password: string, listenAddrs?: string[]): Promise<Libp2p> {
      this.zId = new ZID();
      await this.zId.create(fileName); // get existing/create new peer id
      const peerId = this.zId.peerId;

      listenAddrs = listenAddrs ?? [];
      const options = {
        peerId,
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/0.0.0.0/tcp/0/ws',
            // custom deployed webrtc-star signalling server
            '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
            ...listenAddrs
          ]
        },
        modules: {
          transport: [TCP],
          streamMuxer: [Mplex],
          connEncryption: [NOISE],
          dht: KadDHT,
          pubsub: Gossipsub,
          peerDiscovery: [Mdns]
        },
        config: {
          dht: {
            enabled: false
          },
          pubsub: {
            enabled: true,
            // uncomment to enable publishing node to listen to it's "own" message
            // emitSelf: true
          }
        }
      };

      // add webrtc-transport if listen addresses has "p2p-webrtc-star"
      const starAddresses = options.addresses.listen.filter(a => a.includes('p2p-webrtc-star'));
      if (starAddresses.length) { addWebRTCStarAddrs(options); }

      this.ipfs = await IPFS.create({
        libp2p: options,
        repo: `.jsipfs/${peerId.toB58String()}`,
        init: {
          privateKey: peerId
        },
        relay: { enabled: false },
        config: {
          Addresses: {
            Swarm: [],
          },
          Bootstrap: []
        }
      });
      // need to go through type hacks here..
      const node = (this.ipfs as any).libp2p as Libp2p;

      console.log('zChain Node Activated: ' + node.peerId.toB58String());

      this.node = node;

      // intialize zstore
      this.zStore = new ZStore(this.ipfs, this.node, password);
      await this.zStore.init();

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
      return node;
    }

    listen (topic: string): void {
      this.node.pubsub.on(topic, async (msg: PubSubMessage) => {
        console.log(`Received from ${msg.from}: ${uint8ArrayToString(msg.data)}`);

        // append message to feeds, topics hypercore logs
        await this.zStore.handleListen(topic, msg);
      });
    }

    subscribe (topic: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }
      this.node.pubsub.subscribe(topic);
      console.log(this.zId.peerId.toB58String() + " has subscribed to: " + topic);
    }

    async publish (topic: string, msg: string): Promise<void> {
      await this.node.pubsub
        .publish(topic, fromString(msg))
        .catch(err => { throw new Error(err); });

      await this.zStore.handlePublish(topic, msg);
    }
}
