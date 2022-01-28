import { ZCHAIN } from './zchain';
import { Multiaddr } from 'multiaddr';
import delay from 'delay';
const { fromString } = require('uint8arrays/from-string');

const topic: string = "meow";

;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize();

    let node_b = new ZCHAIN();
    await node_b.initialize();

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
    }, 3000)
})();