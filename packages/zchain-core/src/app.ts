import { ZCHAIN } from './zchain';

;(async () => {
    var zchain = new ZCHAIN();
    await zchain.initialize();

    console.log(zchain.node!.connectionManager.size);

    zchain.addProtocol();
 
    zchain.node!.multiaddrs.forEach((ma) => console.log(ma.toString() +
    '/p2p/' + zchain.node!.peerId.toB58String()));
})();