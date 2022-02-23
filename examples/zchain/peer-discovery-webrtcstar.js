import { ZCHAIN } from "zchain-core";

const publicWebRTCStarSevers = [
  '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
  '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
];

/**
 * Peer Discovery example using webrtc-star signalling server
 * + Initially connection is made to the signalling server
 * + As more peers makes contact with the signalling servers, our
 * local node (possibly behind a NAT/firewall) starts discovering other peers
 */
;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize('node-1.json', publicWebRTCStarSevers); // present in /ids, so peer id will be loaded
    node_a.peerDiscovery.onConnect((connection) => {
      // Emitted when a peer has been found
      console.log('Connection established to:', connection.remotePeer.toB58String())
    });

    node_a.peerDiscovery.onDiscover((peerId) => {
      console.log('Discovered:', peerId.toB58String())
    });

    await node_a.node.start();
})();