import { createLibp2p } from "libp2p";
import { IPFS as IIPFS } from 'ipfs';
import * as IPFS from 'ipfs';

import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { KadDHT } from '@libp2p/kad-dht'
import { Bootstrap } from '@libp2p/bootstrap'
import { MulticastDNS } from '@libp2p/mdns'
import { WebRTCStar } from "@libp2p/webrtc-star";
import wrtc from "wrtc";

import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

import { PubSubMessage } from "../types.js";
import { PeerDiscovery } from "./peer-discovery.js";
import { ZStore } from './storage.js';
import { ZID } from "./zid.js";
import chalk from 'chalk';
import { DB_PATH, IPFS_PATH, RELAY_ADDRS, ZCHAIN_DIR, ZID_PATH } from './constants.js';

import { Daemon } from 'ipfs-daemon'
import path from 'path'
import fs from "fs";
import { getIpfs, isDaemonOn } from './utils.js';
import { WebSockets } from '@libp2p/websockets'

export const password = "ratikjindal@3445"

export class ZCHAIN {
    ipfs: IIPFS | undefined;
    node: any | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;
    zStore: ZStore;

    async _getIPFSOptions(listenAddrs?: string[]) {
      const peerId = this.zId.peerId;

      listenAddrs = listenAddrs ?? [];
      const transportKey = WebRTCStar.prototype[Symbol.toStringTag]
      const options = {
        peerId,
        addressManager: {
          autoDial: true
        },
        connectionManager: {
          dialTimeout: 60000
        },
        transports: [
          new WebRTCStar({ wrtc: wrtc })
        ],
        streamMuxers: [
          new Mplex()
        ],
        connectionEncryption: [
          new Noise()
        ],
        //dht: new KadDHT(),
        pubsub: new GossipSub(),
        peerDiscovery: [
          // new Bootstrap({
          //   list: [
          //     ...RELAY_ADDRS
          //   ],
          //   interval: 2000
          // }),
          new MulticastDNS({
            interval: 1000
          })
        ],
        config: {
          dht: {
            enabled: false
          },
          pubsub: {
            enabled: true,
            // uncomment to enable publishing node to listen to it's "own" message
            // emitSelf: true
          },
          transport: {
            [transportKey]: {
              wrtc // You can use `wrtc` when running in Node.js
            }
          }
        }
      };

      const ipfsOptions = {
        libp2p: options,
        repo: path.join(IPFS_PATH, this.zId.name),
        init: {
          privateKey: peerId
        },
        config: {
          Addresses: {
            Swarm: [
              '/ip4/0.0.0.0/tcp/0/ws',
              '/ip4/0.0.0.0/tcp/0',
              // custom deployed webrtc-star signalling server
              '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
              '/dns4/sheltered-mountain-08581.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
              ...listenAddrs
            ]
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
    async initialize (name: string, listenAddrs?: string[]): Promise<any> {
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
      const node = (this.ipfs as any).libp2p as any;
      console.log("\n★ ", chalk.cyan('zChain Node Activated: ' + node.peerId.toString()) + " ★\n");
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
        ...(ipfsOptions as any)
      });
      await daemon.start();
      this.ipfs = daemon._ipfs;

      // need to go through type hacks here :(
      const node = (this.ipfs as any).libp2p as any;

      console.log("\n★", chalk.cyan('zChain Daemon Activated: ' + node.peerId.toString()) + " ★\n");
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
      const libp2p = await createLibp2p(ipfsOptions.libp2p as any);
      (this.ipfs as any).libp2p = libp2p;

      const node = (this.ipfs as any).libp2p as any;
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

      this.ipfs.pubsub.subscribe(channel, async (msg) => {
        const [_, __, displayStr] = this.zStore.getNameAndPeerID(msg.from.toString());

        console.log(`Received from ${displayStr} on channel ${channel}: ${uint8ArrayToString(msg.data)}`);
      });
    }

    unsubscribe (channel: string): void {
      if (!this.ipfs.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.ipfs.pubsub.unsubscribe(channel);
      console.log(this.zId.peerId.toString() + " has unsubscribed from: " + channel);
    }

    async publish (channel: string, msg: string, channels: string[]): Promise<void> {
      await this.ipfs.pubsub
        .publish(channel, fromString(msg))
        .catch(err => { throw new Error(err); });

      await this.zStore.handlePublish(msg, channels);
    }
}
