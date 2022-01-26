import Libp2p from "libp2p";
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
import KadDHT from 'libp2p-kad-dht';
const Gossipsub = require('libp2p-gossipsub');
const Mplex = require('libp2p-mplex');
import PeerId from "peer-id";

import { stdinToStream, streamToConsole } from './stream';
const { fromString } = require('uint8arrays/from-string');

export class ZCHAIN {

    node: Libp2p | undefined;
    peerId: PeerId | undefined;

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
                }
            }
        }

        const node = await Libp2p.create(options);
        await node.start();

        console.log('zChain Node Activated: ' + node.peerId.toB58String())

        this.node = node;
        this.peerId = node.peerId;
        
        return node;
    }

    async listen(topic: string) {
        await this.node!.pubsub.on(topic, (msg) => {
            console.log(msg);
        });
    }

    async subscribe(topic: string) {
        if (!this.node!.pubsub) {
            throw new Error('pubsub has not been configured')
        }
        await this.node!.pubsub.subscribe(topic);
        console.log(this.peerId + " has subscribed to: " + topic);
    }

    async publish(topic: string, msg: string) {
        await this.node!.pubsub.publish(topic, fromString(msg));        
    }
}