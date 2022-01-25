import { ZCHAIN } from './zchain';
import { Multiaddr } from 'multiaddr';
import delay from 'delay';
const { fromString } = require('uint8arrays/from-string');

;(async () => {
    let zchain = new ZCHAIN();
    await zchain.initialize();

    let zchain1 = new ZCHAIN();
    await zchain1.initialize();

    //add nodes to peer store
    console.log('Connection: ' + zchain.node!.connectionManager.size);
    await zchain.node!.peerStore.addressBook.set(zchain1.node!.peerId, zchain1.node!.multiaddrs);
    await zchain.node!.dial(zchain1.node!.peerId);
    console.log('Connection: ' + zchain.node!.connectionManager.size);

    zchain.node!.pubsub.on("meow", (msg) => {
      console.timeLog('meow');
      console.log(msg);
    });
    
    await zchain.subscribe("meow");

    await zchain1.listen();
    await zchain1.subscribe("meow");

    zchain1.publish("meow", "hello");

    setInterval(() => {
      zchain1.node!.pubsub.publish("meow", fromString('Bird bird bird, bird is the word!'))
    }, 1000)

    // let zchain2 = new ZCHAIN(1);
    // await zchain2.initialize();
    // zchain2.subscribe("meow");
    // zchain2.listen();
    // await zchain1.node!.peerStore.addressBook.set(zchain2.node!.peerId, zchain2.node!.multiaddrs);

    // const listenerMa = new Multiaddr(`/ip4/127.0.0.1/tcp/10333/p2p/${zchain2.node!.peerId.toB58String()}`);

    // const { stream } = await zchain1.node!.dialProtocol(listenerMa, '/chat/1.0.0');


    // await zchain1.node!.dial(zchain2.node!.peerId);
    // zchain2.node!.pubsub.subscribe("meow");

    // var zchain3 = new ZCHAIN();
    // await zchain3.initialize();
    // await zchain2.node!.dial(zchain3.node!.peerId)
    // await zchain2.node!.peerStore.addressBook.set(zchain3.node!.peerId, zchain3.node!.multiaddrs);
    // zchain3.node!.pubsub.on("meow", (msg) => {
    //   console.log("xxxxx");
    //   console.log(msg);
    // });
    // zchain3.node!.pubsub.subscribe("meow");

    // await zchain3.node!.peerStore.addressBook.set(zchain3.node!.peerId, zchain3.node!.multiaddrs);

    // zchain1.listen();
    // zchain2.listen();
    // zchain3.listen();

    // await delay(100);


    // setInterval(() => {
    //   zchain2.node!.pubsub.publish("meow", fromString('Bird bird bird, bird is the word!'));
    // }, 1000);

    // console.log(zchain1.node!.connectionManager.size);

    // const peer = await zchain1.node!.peerRouting.findPeer(zchain2.node!.peerId);
    // peer.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${peer.id.toB58String()}`));
    
    // console.log(zchain1.node!.connectionManager.size);
})();