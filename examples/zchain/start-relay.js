import { ZCHAIN } from "zchain-core";


/**
 * Publish Subsribe example
 */
;(async () => {
    let node_a = new ZCHAIN();
    await node_a.initialize('node-1');

    // let node_b = new ZCHAIN();
    // await node_b.initialize('node-2');

})();