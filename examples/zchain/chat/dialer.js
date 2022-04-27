import { ZCHAIN, stdinToStream, streamToConsole } from "zchain-core";
import { Multiaddr } from 'multiaddr';

const password = 'jindalratik@1234';

/**
 * Publish Subsribe example
 */
;(async () => {
  let node_a = new ZCHAIN();
  await node_a.initialize('node-1.json'); // present in /ids, so peer id will be loaded

  // const orbitdb = await OrbitDB.createInstance(node_a.node, { id: node_a.node.peerId.toB58String() });
  // const db = await orbitdb.eventlog('site.visitors')

  node_a.peerDiscovery.onConnect(async (connection) => {
    console.log('Connection established to:', connection.remotePeer.toB58String());
    const listenerMa = new Multiaddr(`/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/${connection.remotePeer.toB58String()}`)
    const { stream } = await node_a.node.dialProtocol(listenerMa, '/chat/1.0.0')

    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  });

  node_a.peerDiscovery.onDiscover((peerId) => {
    console.log('Discovered:', peerId.toB58String());
  });

  await node_a.node.start();
})();