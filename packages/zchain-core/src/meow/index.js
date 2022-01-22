import { ZCHAIN } from './zchain.js';

import delay from 'delay'

;(async () => {
  // const [node1, node2, node3] = await Promise.all([
  //   new zchain(),
  //   new zchain(),
  //   new zchain()
  // ])

  const node = new ZCHAIN;
  const node1 = await node._initialize();

  const wode = new ZCHAIN;
  const node2 = await node._initialize();

  const mode = new ZCHAIN;
  const node3 = await node._initialize();

  node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  node2.peerStore.addressBook.set(node3.peerId, node3.multiaddrs)

  await Promise.all([
    node1.dial(node2.peerId),
    node2.dial(node3.peerId)
  ])

  // The DHT routing tables need a moment to populate
  await delay(1000)

  const peer = await node2.peerRouting.findPeer(node3.peerId);

  console.log('Found it, multiaddrs are:')
  peer.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${peer.id.toB58String()}`))
})();