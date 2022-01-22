import Libp2p from "libp2p";
import KadDHT from 'libp2p-kad-dht';
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
const Mplex = require('libp2p-mplex');

import delay from 'delay'

// ZCHAIN

export class ZCHAIN {

  zchain: Libp2p | undefined;

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
    
      console.log('zChain Node Activated: ' + node.peerId.toB58String())
      await node.start()
      this.zchain = node;
      return node;
    }
}

;(async () => {
    const node1 = new ZCHAIN();
    await node1.initialize();
    console.log(node1.zchain.keychain);

    const node2 = new ZCHAIN();
    await node2.initialize();

    const node3 = new ZCHAIN();
    await node3.initialize();

    // await Promise.all([
    //     node1.dial(node2.zchain.peerId),
    //     node2.dial(node3.zchain.peerId)
    // ]);

    // await delay(1000);

    // const peer = await node2.peerRouting.findPeer(node3.peerId);
  
    // console.log('Found it, multiaddrs are:');
    // peer.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${peer.id.toB58String()}`));
})();