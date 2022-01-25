'use strict'

import Libp2p from 'libp2p';
import TCP from 'libp2p-tcp';
import Mplex from 'libp2p-mplex';
import { NOISE } from '@chainsafe/libp2p-noise'
import Gossipsub from '@achingbrain/libp2p-gossipsub'
import { fromString } from 'uint8arrays/from-string';
import { toString } from 'uint8arrays/to-string'

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [NOISE],
      pubsub: Gossipsub
    }
  })

  await node.start();
  const gsub = new Gossipsub(node);
  await gsub.start();

  return node
}

;(async () => {
  const topic = 'news'

  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  // Add node's 2 data to the PeerStore
  console.log('Connection Before: ' + node1.connectionManager.size);
  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node1.dial(node2.peerId)
  console.log('Connection After: ' + node1.connectionManager.size);

  await node1.pubsub.on(topic, (msg) => {
    console.log(`node1 received: ${fromString(msg.data)}`)
  })
  node1.pubsub.subscribe(topic)

  const handler = (msg) => {
    console.log('hi');
  }

  node1.pubsub.on(topic, handler)
  node1.pubsub.subscribe(topic)

  // Will not receive own published messages by default
  node2.pubsub.on(topic, (msg) => {
    console.log(`node2 received: ${fromString(msg.data)}`)
  })


  // node2 publishes "news" every second
  setInterval(() => {
    node1.pubsub.publish(topic, new TextEncoder().encode('Bird bird bird, bird is the word!'));
    console.log(node1.pubsub.subscriptions);
    node1.pubsub.subscribe("news");
    console.log(node1.pubsub.getSubscribers(topic));
  }, 1000)
})()