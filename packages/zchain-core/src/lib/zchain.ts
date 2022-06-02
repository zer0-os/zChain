import { NOISE } from '@chainsafe/libp2p-noise';
import Libp2p from "libp2p";
import { IPFS as IIPFS } from 'ipfs';
import * as IPFS from 'ipfs';

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
import { DB_PATH, DEFAULT_NETWORK, IPFS_PATH, RELAY_ADDRS, ZCHAIN_DIR, ZID_PATH } from './constants';

import { Daemon } from 'ipfs-daemon'
import path from 'path'
import fs from "fs";
import { getIpfs, isDaemonOn } from './utils';
import WebSocket from 'libp2p-websockets'

export const password = "ratikjindal@3445"

export class ZCHAIN {
    ipfs: IIPFS | undefined;
    node: Libp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;

    async _getIPFSOptions(listenAddrs?: string[]) {
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
            // emitSelf: true
          }
        }
      };

      // add webrtc-transport if listen addresses has "p2p-webrtc-star"
      const starAddresses = options.addresses.listen.filter(a => a.includes('p2p-webrtc-star'));
      if (starAddresses.length) { addWebRTCStarAddrs(options); }

      const ipfsOptions = {
        libp2p: options,
        repo: path.join(IPFS_PATH, this.zId.name),
        init: {
          privateKey: peerId
        },
        config: {
          Addresses: {
            Swarm: [],
          },
          Bootstrap: [
            ...RELAY_ADDRS
          ],
          "Swarm": {
              "ConnMgr": {
                  "LowWater": 80,
                  "HighWater": 160
              },
              "EnableAutoRelay": true,
              "DisableNatPortMap": false
          },
        }
      };

      return ipfsOptions;
    }

    /**
     * Initializes a new (local) Zchain node
     * @param name Name assinged to this node (by the user)
     * @returns libp2p node instance
     */
    async initialize (name: string, listenAddrs?: string[]): Promise<Libp2p> {
      fs.mkdirSync(ZID_PATH, { recursive: true });
      fs.mkdirSync(IPFS_PATH, { recursive: true });
      fs.mkdirSync(DB_PATH, { recursive: true });

      this.zId = new ZID();
      await this.zId.createFromName(name); // get existing/create new peer id
      const ipfsOptions = await this._getIPFSOptions(listenAddrs);

      this.ipfs = await IPFS.create({
        ...ipfsOptions,
      });

      // need to go through type hacks here..
      const node = (this.ipfs as any).libp2p as Libp2p;
      console.log("\n★ ", chalk.cyan('zChain Node Activated: ' + node.peerId.toB58String()) + " ★\n");
      this.node = node;

      // intialize zstore
      this.zStore = new ZStore(this.ipfs, this.node, password);
      await this.zStore.init(this.zId.name);

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
      return node;
    }

    /**
     * Initializes an IPFS zChain (online) Daemon (or load an existing one)
     * @param name Name assinged to this node (by the user)
     * @returns ipfs daemon instance
     * TODO: think about how to handle "password" (message encryption/decryption)
     */
    async startDaemon (name: string, listenAddrs?: string[]): Promise<Daemon> {
      fs.mkdirSync(ZID_PATH, { recursive: true });
      fs.mkdirSync(IPFS_PATH, { recursive: true });
      fs.mkdirSync(DB_PATH, { recursive: true });


      // load zId
      this.zId = new ZID();
      await this.zId.createFromName(name); // get existing/create new peer id

      // start daemon, initialize ipfs + libp2p
      const ipfsOptions = await this._getIPFSOptions(listenAddrs);
      const daemon = new Daemon({
        ...ipfsOptions
      });
      await daemon.start();
      this.ipfs = daemon._ipfs;

      // need to go through type hacks here :(
      const node = (this.ipfs as any).libp2p as Libp2p;

      console.log("\n★", chalk.cyan('zChain Daemon Activated: ' + node.peerId.toB58String()) + " ★\n");
      this.node = node;

      // intialize zstore
      this.zStore = new ZStore(this.ipfs, this.node, password);

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
      return daemon;
    }

    /**
     * Initializes from an existing daemon http endpoint (located at ~/.zchain/ipfs/<name>/api)
     */
    async load(name: string): Promise<void> {
      if (!isDaemonOn()) {
        throw new Error(chalk.red(`Daemon not initialized at ~/.zchain. Please run "meow daemon .."`));
      }
      this.ipfs = await getIpfs();

      this.zId = new ZID();
      await this.zId.createFromName(name);

      const ipfsOptions = await this._getIPFSOptions();
      const libp2p = new Libp2p(ipfsOptions.libp2p);
      (this.ipfs as any).libp2p = libp2p;

      const node = (this.ipfs as any).libp2p as Libp2p;
      this.node = node;

      // intialize zstore (note we're initializing both in meow app)
      this.zStore = new ZStore(this.ipfs, this.node, password);
      await this.zStore.init(this.zId.name);

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
    }

    subscribe (channel: string): void {
      if (!this.ipfs.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.ipfs.pubsub.subscribe(channel, async (msg: PubSubMessage) => {
        const [_, __, displayStr] = this.zStore.getNameAndPeerID(msg.from);

        console.log(`Received from ${displayStr} on channel ${channel}: ${uint8ArrayToString(msg.data)}`);
      });
    }

    unsubscribe (channel: string): void {
      if (!this.ipfs.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.ipfs.pubsub.unsubscribe(channel);
      console.log(this.zId.peerId.toB58String() + " has unsubscribed from: " + channel);
    }

    async publish (channel: string, msg: string, channels: string[]): Promise<void> {
      await this.ipfs.pubsub
        .publish(channel, fromString(msg))
        .catch(err => { throw new Error(err); });

      // if channel includes a network::channel, split and pass separately.
      // this is done to keep zchain independent of networks. Only add network
      // if it's been passed from top(meow app)
      let network;
      if (channel.includes('::')) {
        network = channel.split('::')[0];
      }
      await this.zStore.handlePublish(msg, channels, network);
    }
}
