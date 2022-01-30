import Libp2p from "libp2p";
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
import KadDHT from 'libp2p-kad-dht';
const Gossipsub = require('libp2p-gossipsub');
const Mplex = require('libp2p-mplex');
import PeerId from "peer-id";

import { PubSubMessage } from "../types";
import { PeerDiscovery } from "./peer-discovery";
const { fromString } = require('uint8arrays/from-string');
const { toString: uint8ArrayToString } = require('uint8arrays/to-string');

export class ZCHAIN {

    node: Libp2p | undefined;
    peerId: PeerId | undefined;
    peerDiscovery: PeerDiscovery | undefined;

    constructor() { }

    async initialize(): Promise<Libp2p> {
        const options = {
            addresses: {
                listen: ['/ip4/0.0.0.0/tcp/0']
            },
            modules: {
                transport: [ TCP ],
                streamMuxer: [ Mplex ],
                connEncryption: [ NOISE ],
                dht: KadDHT,
                pubsub: Gossipsub
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

        const node = await Libp2p.create(options);
        await node.start();

        console.log('zChain Node Activated: ' + node.peerId.toB58String())

        this.node = node;
        this.peerId = node.peerId;
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
        console.log(this.peerId + " has subscribed to: " + topic);
    }

    publish(topic: string, msg: string) {
        this.node!.pubsub.publish(topic, fromString(msg));
    }
}