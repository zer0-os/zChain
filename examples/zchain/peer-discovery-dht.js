import { ZCHAIN } from "zchain-core";
const password = 'jindalratik@1234';

// list of bootstrap nodes we're going to connect to
const bootstrappers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
];

/**
 * Peer Discovery example using bootstrapped nodes & DHT
 * + Initially connection is made to few bootstrappped nodes
 * + After bootstrap connections, DHT kicks in and we start discovering more peers
 */
;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize('node-1');

    let node_b = new ZCHAIN();
    await node_b.initialize('node-2');

    // configure bootstrap nodes for A, enable connect, discover handlers.
    node_a.peerDiscovery.addBootstrapNodes(bootstrappers);
    node_a.peerDiscovery.onConnect((connection) => {
      // Emitted when a peer has been found
      console.log('Connection established to:', connection.remotePeer.toB58String())
    });

    node_a.peerDiscovery.onDiscover((peerId) => {
      console.log('Discovered:', peerId.toB58String())
    });

    await node_a.node.start();
    await node_b.node.start();
})();