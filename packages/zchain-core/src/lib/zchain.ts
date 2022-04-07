import { NOISE } from '@chainsafe/libp2p-noise';
import Libp2p, { Libp2pOptions } from "libp2p";
import { IPFS as IIPFS } from 'ipfs';
import * as IPFS from 'ipfs';

import Gossipsub from "libp2p-gossipsub";
import KadDHT from 'libp2p-kad-dht';
import Mdns from "libp2p-mdns";
import Mplex from "libp2p-mplex";
import TCP from 'libp2p-tcp';
import { fromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import Bootstrap from 'libp2p-bootstrap';

import { PubSubMessage, ZChainMessage } from "../types";
import { PeerDiscovery } from "./peer-discovery";
import { ZStore } from './storage';
import { addWebRTCStarAddrs } from "./transport";
import { ZID } from "./zid";
import chalk from 'chalk';
import { RELAY_ADDRS } from './constants';

import { Daemon } from 'ipfs-daemon'
import os from 'os'
import path from 'path'
import fs from "fs";
import { getIpfs, isDaemonOn } from './utils';

import wrtc from 'wrtc' // or 'electron-webrtc'
import WebRTCStar from 'libp2p-webrtc-star'
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
            '/ip4/0.0.0.0/tcp/0',
            '/ip4/0.0.0.0/tcp/0/ws',
            // custom deployed webrtc-star signalling server
            '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
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
        repo: `.jsipfs/${peerId.toB58String()}`,
        init: {
          privateKey: peerId
        },
        relay:{ enabled: true, hop: { enabled: true, active: true } },
        config: {
          Addresses: {
            Swarm: [],
          },
          Bootstrap: [
            ...RELAY_ADDRS
          ]
        }
      };

      return ipfsOptions;
    }

    /**
     * Initializes a new (local) Zchain node
     * @param fileName json present in /ids. Contains peer metadata
     * @returns libp2p node instance
     */
    async initialize (fileNameOrPath: string, password: string, listenAddrs?: string[]): Promise<Libp2p> {
      this.zId = new ZID();
      await this.zId.create(fileNameOrPath); // get existing/create new peer id
      const ipfsOptions = await this._getIPFSOptions(listenAddrs);

      this.ipfs = await IPFS.create({
        ...ipfsOptions,
        //repo: path.join(os.homedir(), '/.jsipfs'),
      });


      console.log('this ', await this.ipfs.config.getAll());

      // need to go through type hacks here..
      //const node = await Libp2p.create(ipfsOptions.libp2p);
      const node = (this.ipfs as any).libp2p as Libp2p;
      //await node.start();

      console.log("\n★", chalk.cyan('zChain Node Activated: ' + node.peerId.toB58String()) + " ★\n");
      this.node = node;

      // intialize zstore
      this.zStore = new ZStore(this.ipfs, this.node, password);
        await this.zStore.init();

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
      return node;
    }

    /**
     * Initializes an IPFS zChain (online) Daemon (or load an existing one)
     * @param fileName json present in /ids. Contains peer metadata
     * @returns ipfs daemon instance
     * TODO: think about how to handle "password" (message encryption/decryption)
     */
    async startDaemon (fileNameOrPath?: string, listenAddrs?: string[]): Promise<Daemon> {
      if (!fs.existsSync(path.join(os.homedir(), '/.jsipfs'))) {
        fs.mkdirSync(path.join(os.homedir(), '/.jsipfs'));
      }

      // load zId
      this.zId = new ZID();
      await this.zId.create(fileNameOrPath); // get existing/create new peer id

      // handle case when trying to start daemon with another zId
      if (fs.existsSync(path.join(os.homedir(), '/.jsipfs', 'config'))) {
        const config = fs.readFileSync(path.join(os.homedir(), '/.jsipfs', 'config'), "utf-8");
        const parsedConfig = JSON.parse(config);
        const peerIdStr = parsedConfig['Identity']['PeerID'];
        if (this.zId.peerId.toB58String() !== peerIdStr) {
          throw new Error(chalk.red(`Config mismatch :: Trying to start a new daemon, but a config is already present at ~/.jsipfs for a different zId(${peerIdStr}). Pease use --force to override`));
        }
      }

      // save (copy) the json to ~/.jsipfs/peer.json
      fs.writeFileSync(
        path.join(os.homedir(), '/.jsipfs', 'peer.json'),
        JSON.stringify(this.zId.peerId.toJSON(), null, 2)
      );

      // start daemon, initialize ipfs + libp2p
      const ipfsOptions = await this._getIPFSOptions(listenAddrs);
      const daemon = new Daemon({
        ...ipfsOptions,
        repo: path.join(os.homedir(), '/.jsipfs'),
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
     * Initializes from an existing daemon http endpoint (located at ~/.jsipfs/api)
     */
    async load(): Promise<void> {
      if (!isDaemonOn()) {
        throw new Error(chalk.red(`Daemon not initialized at ~/.jsipfs. Please run "meow daemon .."`));
      }
      this.ipfs = await getIpfs();

      // create zId from saved json peer-id (at ~/.jsipfs/peer.json)
      this.zId = new ZID();
      await this.zId.create(path.join(os.homedir(), '/.jsipfs', 'peer.json'));

      const ipfsOptions = await this._getIPFSOptions();
      const libp2p = new Libp2p(ipfsOptions.libp2p);
      (this.ipfs as any).libp2p = libp2p;

      const node = (this.ipfs as any).libp2p as Libp2p;
      this.node = node;

      // intialize zstore
      this.zStore = new ZStore(this.ipfs, this.node, password);
      await this.zStore.init();

      // initialize discovery class
      this.peerDiscovery = new PeerDiscovery(this.zStore, this.node);
    }

    subscribe (topic: string): void {
      if (!this.ipfs.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.ipfs.pubsub.subscribe(topic, async (msg: PubSubMessage) => {
        console.log(`Received from ${msg.from}: ${uint8ArrayToString(msg.data)}`);

        // append message to feeds, topics hypercore logs
        //await this.zStore.handleListen(topic, msg);
      });

      console.log(this.zId.peerId.toB58String() + " has subscribed to: " + topic);
    }

    unsubscribe (topic: string): void {
      if (!this.ipfs.pubsub) {
        throw new Error('pubsub has not been configured');
      }

      this.ipfs.pubsub.unsubscribe(topic);
      console.log(this.zId.peerId.toB58String() + " has unsubscribed from: " + topic);
    }

    async publish (topic: string, msg: string): Promise<void> {
      await this.ipfs.pubsub
        .publish(topic, fromString(msg))
        .catch(err => { throw new Error(err); });

      await this.zStore.handlePublish(topic, msg);
    }
}
