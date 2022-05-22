import { ZCHAIN } from "zchain-core";


/**
 * Publish Subsribe example
 */
;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize('relay1', [
        //'/ip4/0.0.0.0/tcp/0/ws',
        '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/'
    ]);

    // let node_b = new ZCHAIN();
    // await node_b.initialize('node-2');

})();
