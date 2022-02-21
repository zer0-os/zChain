import { ZCHAIN } from "zchain-core";

const topic = "meow";

/**
 * Publish Subsribe example
 */
;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize('node-1.json'); // present in /ids, so peer id will be loaded

    let node_b = new ZCHAIN();
    await node_b.initialize('node-2.json'); // not present, a new peer id will be generated & saved

    await node_a.node.start();
    await node_b.node.start();

    //add nodes to peer store
    await node_a.node.peerStore.addressBook.set(node_b.node.peerId, node_b.node.multiaddrs);
    await node_a.node.dial(node_b.node.peerId);

    node_a.listen(topic);
    node_a.subscribe(topic);

    node_b.listen(topic);
    node_b.subscribe(topic);

    setInterval(() => {
      console.log('Connection Size: ' + node_a.node.connectionManager.size);
      node_a.publish(topic, 'Bird bird bird, bird is the word!');
    }, 3000);
})();