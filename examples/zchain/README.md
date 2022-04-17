# ZChain examples

This folder contains libp2p use cases examples using `zchain`.
+ `peer-discovery.js`: discover peers accross the network (using bootstrap nodes and DHT)
+ `pubsub.js`: publish subscribe example (nodes subscribe to a channel, and recieve a published message with same channel)

To run any example, **build** the packages/zchain-core first (npm i && npm run build). Then you can run `node <file.js>` in the `/example/zchain` directory.

**NOTE:** `/ids` must be present in your root directory. It contains the peer-id's used accross the examples.