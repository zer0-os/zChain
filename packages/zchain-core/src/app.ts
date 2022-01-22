
import express from 'express';
import Libp2p from "libp2p";
import KadDHT from 'libp2p-kad-dht';
import TCP from 'libp2p-tcp'
import { NOISE } from '@chainsafe/libp2p-noise';
const Mplex = require('libp2p-mplex');

import delay from 'delay'

// ZCHAIN

export class ZCHAIN {

    constructor() { }

    async _initialize(): Promise<Libp2p> {
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
      
        console.log('New zChain node started...')
        await node.start()
        return node;
      }

}

;(async () => {
    const node = new ZCHAIN;
    const node1 = await node._initialize();
    console.log(node);

    const wode = new ZCHAIN;
    const node2 = await wode._initialize();
  
    const mode = new ZCHAIN;
    const node3 = await mode._initialize();

    await Promise.all([
        node1.dial(node2.peerId),
        node2.dial(node3.peerId)
    ]);

    await delay(1000);

    const peer = await node2.peerRouting.findPeer(node3.peerId);
  
    console.log('Found it, multiaddrs are:');
    peer.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${peer.id.toB58String()}`));
})();

// Express

const app = express();

app.get('/', (req, res) => {
    res.send('Hello');
});

app.listen(5100, () => console.log('Server running'));