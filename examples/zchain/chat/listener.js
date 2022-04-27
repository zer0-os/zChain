import { ZCHAIN, stdinToStream, streamToConsole } from "zchain-core";

const password = 'jindalratik@1234';

/**
 * Publish Subsribe example
 */
;(async () => {
  let node_b = new ZCHAIN();
  await node_b.initialize('node-2.json'); // not present, a new peer id will be generated & saved

  node_b.peerDiscovery.onConnect((connection) => {
    console.log('Connection established to:', connection.remotePeer.toB58String());
  });

  node_b.peerDiscovery.onDiscover((peerId) => {
    console.log('Discovered:', peerId.toB58String());
  });

  // Handle messages for the protocol
  await node_b.node.handle('/chat/1.0.0', async ({ stream }) => {
    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  })

  await node_b.node.start();

  console.log('Listener ready, listening on:')
  node_b.node.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + node_b.node.peerId.toB58String())
  })
})();