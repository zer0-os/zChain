import Libp2p from "libp2p";
import KadDHT from 'libp2p-kad-dht';
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
const Mplex = require('libp2p-mplex');

export class ZCHAIN {

  node: Libp2p | undefined;
  peerId: object = {};

  constructor() { }

  async initialize(): Promise<Libp2p> {
    const node = await Libp2p.create({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      modules: {
        transport: [ TCP ],
        streamMuxer: [ Mplex ],
        connEncryption: [ NOISE ],
        dht: KadDHT
      },
      config: {
        dht: {
          enabled: true
        }
      }
    });
    
    await node.start();
    console.log('zChain Node Activated: ' + node.peerId.toB58String())

    this.node = node;
    this.peerId = node.peerId;
    
    return node;
  }

  async addProtocol() {
    await this.node!.handle('/chat/1.0.0', async ({ stream }) => {
      //To Do: Manage IO via stream
      console.log('Connected to protocol: /chat/1.0.0');
      console.log(this.node!.connectionManager.size);
    })
  }

}