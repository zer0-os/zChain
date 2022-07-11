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

import { Daemon } from 'ipfs-daemon'
import fs from "fs";
import WebSocket from 'libp2p-websockets'

export const password = "ratikjindal@3445"

export class ZCHAIN {
    node: Libp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;

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

      this.node.connectionManager.on('peer:disconnect', async (connection) => {
        console.log('Disconnected from peer:', connection.remotePeer.toB58String());
      });

      this.node.connectionManager.on('peer:connect', async (connection) => {
        console.log('Connection established to:', connection.remotePeer.toB58String());
      });

      this.peerDiscovery.onDiscover((peerId) => {
        console.log('Discovered:', peerId.toB58String());
      });

      return this.node;
    }

    /**
     * Initializes an IPFS zChain (online) Daemon (or load an existing one)
     * @param name Name assinged to this node (by the user)
     * @returns ipfs daemon instance
     * TODO: think about how to handle "password" (message encryption/decryption)
     */
    async startDaemon (name: string, listenAddrs?: string[]): Promise<Daemon> {
      return 1 as any;
    }

    /**
     * Initializes from an existing daemon http endpoint (located at ~/.zchain/ipfs/<name>/api)
     */
    async load(name: string): Promise<void> {
    }

    listen (channel: string): void {
      this.node.pubsub.on(channel, async (msg: PubSubMessage) => {
        const [_, __, displayStr] = this.zStore.getNameAndPeerID1(msg.from);
        console.log(`Received from ${displayStr} on channel ${channel}: ${uint8ArrayToString(msg.data)}`);
      });
    }

    subscribe (channel: string): void {
      if (!this.node.pubsub) {
        throw new Error('pubsub has not been configured');
      }
      this.node.pubsub.subscribe(channel);
      this.listen(channel);
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
      // if it's been passed from top(meow app)
      let network: string;
      if (channel.includes('::')) {
        network = channel.split('::')[0];
      }
      await this.zStore.handlePublish1(msg, channels, network);
    }
}
