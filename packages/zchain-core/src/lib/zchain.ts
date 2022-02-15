import Libp2p from "libp2p";
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
import KadDHT from 'libp2p-kad-dht';
const Gossipsub = require('libp2p-gossipsub');
const Mplex = require('libp2p-mplex');
const Mdns = require('libp2p-mdns');

import { PubSubMessage } from "../types";
import { PeerDiscovery } from "./peer-discovery";
import { addWebRTCStarAddrs } from "./transport";
import { ZID } from "./zid";
const { fromString } = require('uint8arrays/from-string');
const { toString: uint8ArrayToString } = require('uint8arrays/to-string');

export class ZCHAIN {
    node: Libp2p | undefined;
    zId: ZID | undefined;
    peerDiscovery: PeerDiscovery | undefined;

    constructor() { }

    /**
     * Initializes a new Zchain node
     * @param fileName json present in /ids. Contains peer metadata
     * @returns libp2p node instance
     */
    async initialize(fileName: string, listenAddrs?: string[]): Promise<Libp2p> {
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
                transport: [ TCP ],
                streamMuxer: [ Mplex ],
                connEncryption: [ NOISE ],
                dht: KadDHT,
                pubsub: Gossipsub,
                peerDiscovery: [ Mdns ]
            },
            config: {
                dht: {
                    enabled: true
                },
                pubsub: {
                    enabled: true,
                    // uncomment to enable publishing node to listen to it's "own" message
                    //emitSelf: true
                }
            }
        }

        // add webrtc-transport if listen addresses has "p2p-webrtc-star"
        const starAddresses = options.addresses.listen.filter(a => a.includes('p2p-webrtc-star'));
        if (starAddresses.length) { addWebRTCStarAddrs(options); }

        const node = await Libp2p.create(options);
        await node.start();

        console.log('zChain Node Activated: ' + node.peerId.toB58String())

        this.node = node;
        this.peerDiscovery = new PeerDiscovery(this.node);
        return node;
    }

    listen(topic: string) {
        this.node!.pubsub.on(topic, (msg: PubSubMessage) => {
            console.log(`Received from ${msg.from}: ${uint8ArrayToString(msg.data)}`);
        });
    }

    subscribe(topic: string) {
        if (!this.node!.pubsub) {
            throw new Error('pubsub has not been configured')
        }
        this.node!.pubsub.subscribe(topic);
        console.log(this.zId!.peerId + " has subscribed to: " + topic);
    }

    publish(topic: string, msg: string) {
        this.node!.pubsub.publish(topic, fromString(msg));
    }
}