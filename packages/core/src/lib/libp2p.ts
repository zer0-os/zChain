import { Libp2p as ILibp2p } from "libp2p";
import {PeerId} from "@libp2p/interface-peer-id";
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { kadDHT } from '@libp2p/kad-dht'
import { mdns } from '@libp2p/mdns'
import { webRTCStar } from "@libp2p/webrtc-star";
import { bootstrap } from "@libp2p/bootstrap";
import { webSockets } from '@libp2p/websockets'
import wrtc from "@koush/wrtc";
import { Multiaddr } from 'multiaddr';
import delay from "delay";

export async function createLibp2pNode(peerId: PeerId): Promise<ILibp2p> {
  const star = webRTCStar({ wrtc: wrtc });
  return await createLibp2p({
    peerId,
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        //'/ip4/0.0.0.0/tcp/0/ws',
        // // custom deployed webrtc-star signalling server
        '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
        '/dns4/sheltered-mountain-08581.herokuapp.com/tcp/443/wss/p2p-webrtc-star/',
      ]
    },
    connectionManager: {
      autoDial: true,
      dialTimeout: 60000
    },
    transports: [
      tcp(),
      //webSockets(),
      star.transport
    ],
    streamMuxers: [
      mplex()
    ],
    peerDiscovery: [
      //bootstrap({ list: [ '/ip4/3.87.239.223/tcp/43311/ws/p2p/12D3KooWErNPNEv8oJd65jWrGyX8c4LuRZdrYCD7x7hYAbpgHaru' ] }),
      mdns({
        interval: 1000
      }),
      star.discovery
    ],
    connectionEncryption: [
      noise()
    ],
    pubsub: gossipsub({
      allowPublishToZeroPeers: true,
      emitSelf: true,
      enabled: true
    })
  });
}