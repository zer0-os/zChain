import Libp2p from 'libp2p';
import KadDHT from 'libp2p-kad-dht';
import TCP from 'libp2p-tcp'
import Mplex from 'libp2p-mplex'
import { NOISE } from '@chainsafe/libp2p-noise'

export class ZCHAIN {

  constructor() { }

  async _initialize() {
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
    })
  
    console.log('New zChain node started...')
    await node.start()
    return node;
  }
}