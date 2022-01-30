import { ZCHAIN } from './lib/zchain';
import { Multiaddr } from 'multiaddr';
import delay from 'delay';
const { fromString } = require('uint8arrays/from-string');

const topic: string = "meow";

// list of bootstrap nodes we're going to connect to
const bootstrappers = [
  '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
];

;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize();

    let node_b = new ZCHAIN();
    await node_b.initialize();

    // configure bootstrap nodes for A, enable connect, discover handlers.
    node_a.peerDiscovery!.addBootstrapNodes(bootstrappers);
    node_a.peerDiscovery!.onConnect();
    node_a.peerDiscovery!.onDiscover();

    await node_a.node!.start();
    await node_b.node!.start();


    //add nodes to peer store
    await node_a.node!.peerStore.addressBook.set(node_b.node!.peerId, node_b.node!.multiaddrs);
    await node_a.node!.dial(node_b.node!.peerId);

    node_a.listen(topic);
    node_a.subscribe(topic);

    node_b.listen(topic);
    node_b.subscribe(topic);

    setInterval(() => {
      console.log('Connection: ' + node_a.node!.connectionManager.size);
      node_a.publish(topic, 'Bird bird bird, bird is the word!');
    }, 3000);
})();