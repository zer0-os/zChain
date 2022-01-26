import { ZCHAIN } from './zchain';
import { Multiaddr } from 'multiaddr';
import delay from 'delay';
const { fromString } = require('uint8arrays/from-string');

let topic: string = "meow";

;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize();

    let node_b = new ZCHAIN();
    await node_b.initialize();

    //add nodes to peer store
    await node_a.node!.peerStore.addressBook.set(node_b.node!.peerId, node_b.node!.multiaddrs);
    await node_a.node!.dial(node_b.node!.peerId);

    node_a.subscribe(topic);
    node_a.listen(topic);
    node_a.publish(topic, "hello");

    node_b.subscribe(topic);
    node_b.listen(topic);
    node_b.publish(topic, "hello");

    setInterval(() => {
      console.log('Connection: ' + node_a.node!.connectionManager.size);
      node_a.node!.pubsub.publish(topic, fromString('Bird bird bird, bird is the word!'))
    }, 10000)
})();