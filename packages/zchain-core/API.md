# zChain API Documentation

API documentation for the `zChain` class.

## Table of Contents

<!-- toc -->

- [Initialize a zChain node](#initialize-a-zChain-node)
  * [initialize (fileNameOrPath?, listenAddrs?)](#initializefileNameOrPath-listenAddrs)
- [Public Instance Methods](#public-instance-methods)
  * [zchain.startDaemon(fileNameOrPath?, listenAddrs?)](#zchainstartdaemonfilenameorpath-listenaddrs)
  * [zchain.load()](#zchainload)
  * [zchain.subscribe(channel)](#zchainsubscribechannel)
  * [zchain.unsubscribe(channel)](#zchainunsubscribechannel)
  * [zchain.publish(channel, message, channels)](#zchainpublishchannel-message-channels)
- [zChain properties](#zchain-properties)
  * [zchain.ipfs](#ipfs)
  * [zchain.node](#node)
  * [zchain.zId](#zid)
    + [`zId.createNew()`](#zidcreatenew)
    + [`zId.create(fileNameOrPath?)`](#zchaincreatefilenameorpath)
  * [zchain.peerDiscovery](#peerdiscovery)
    + [`peerDiscovery.addBootstrapNodes(nodes[])`](#peerdiscoveryaddbootstrapnodesnodes)
    + [`peerDiscovery.onConnect(handler: () => {}))`](#peerdiscoveryonconnect-handler)
    + [`peerDiscovery.onDiscover(handler: () => {}))`](#peerdiscoveryondiscover-handler)
    + [`peerDiscovery.handleProtocol(protocol, handler: () => {})`](#peerdiscoveryhandleprotocolprotocol-handler-props-libp2phandlerprops--void)
  * [zchain.zStore](#zstore)
    + [`zStore.init()`](#zstoreinit)
    + [`zStore.appendZChainMessageToFeed(feedStore, message, channels)`](#zstoreappendzchainmessagetofeedfeedstore-message-channels)
    + [`zStore.listMessagesOnFeed(peerIdStr, n)`](#zstorelistmessagesonfeedpeeridstr-n)

<!-- tocstop -->

## Initialize a zChain node

### initialize(fileNameOrPath, listenAddrs)
```javascript
const zChain = new ZCHAIN();
await zChain.initialize('node-a.json', [ '/ip4/0.0.0.0/tcp/0', .. ]);
```
**NOTE:** `fileNameOrPath` & `listenAddrs` are optional parameters.

Creates and returns an instance of an initialized zChain node. During initialization we:
+ initialize a new zId (ipfs peerID using `fileNameOrPath`)
+ initialize an ipfs node (at `~/.jsipfs/<peer-id>`)
+ initialize zStore (orbit-db storage for messages, at `~/.zchain-db/<peer-id>`)
+ initialize discovery class (for discovery & connections)

Parameters:

- `fileNameOrPath` (string, optional): Value could be either
  * `undefined`: In this case a new node is created automatically at `~/.jsipfs/<peer-id>`
  * `fileName` (must be `.json`): If a filename (having peer public & private keys) is provided (eg. `my-node.json`), then it'll look for this file in `ids/` folder. If found, the node will be initialized using this peer, otherwise zChain will create a new node, and save it's credentials in `ids/my-node.json` file.
  * `filePath`: You can provide a complete path to the peerID file (in `.json`). The file at this path will be used to initialize the node.

- `listenAddrs` (string[], optional): Additional address this node can listen to.

## Public Instance Methods

### zchain.startDaemon(fileNameOrPath?, listenAddrs?)

Similar to `initialize()`, but it starts a new ipfs daemon, which other terminal/processes can connect to using an http endpoint. Note that this won't open/load the databases. This function is meant to run the ipfs node only (as daemon).

### zchain.load()

Connects to an existing ipfs daemon (fails otherwise, you must run start daemon before). Opens and loads up the databases. The usecase for `startDaemon` & `load()` could be within a CLI. On one screen you start the daemon, and on another you connect to it, laod the databases, and execute the commands.


### zchain.subscribe(channel)

Subscribe to a particular channel (topic in pubsub messaging system). After subscribing to a topic, any message published on that topic will be received by this node.

Parameters:
- `channel` (string): Name of the channel to subscribe/follow.


### zchain.unsubscribe(channel)

Unsubscribe from a particular channel (topic in pubsub messaging system). After unsubscribing from a topic, you will no longer receive any message published on that topic.

Parameters:
- `channel` (string): Name of the channel to unsubscribe.


### zchain.publish(channel, message, channels)

Publish a message on a channel(topic).

Parameters:
- `channel` (string): Name of the channel accross which message will be published.
- `message` (string): The message.
- `channels` (string[]): Array of channels (if same message is published on multiple channels, this should be passed).


## zChain properties

`zChain` class properties.

### ipfs

The ipfs node. Repo located at `~/.jsipfs/<peer-id>`. Read more about the ipfs API docs [here](https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/README.md).

### node

Libp2p node. Libp2p (opens new window)is a modular system of protocols, specifications, and libraries that enable the development of peer-to-peer network applications. As the network layer for IPFS, Libp2p provides flexible solutions for essential peer-to-peer elements like transport, security, peer routing, and content discovery. Libp2p node is derived from `ipfs.libp2p`.

### zId

Class representing zchain id (a persistent peer id accross zchain nodes).


#### zId.createNew()

Generates a new peerId, at `~/.jsipfs/<peer-id>`, and saves it at `~/.jsipfs/<peer-id>/peer.json`.

#### zchain.create(fileNameOrPath?)

Creates a new peerID, based on a fileName, or a filePath.

Parameters:
- `fileNameOrPath` (string, optional): Check `zChain.initialize()`.

### peerDiscovery

Class to handle Peer Discovery, connections and protocols by libp2p node

#### peerDiscovery.addBootstrapNodes(nodes)

Adds a list of bootstrapped nodes to the ipfs node. A bootstrap node is a node which the ipfs node connects to initally during start.

#### peerDiscovery.onConnect (handler)

On Connect handler, triggered after a new connection is established.

Parameters:
- `handler` ((connection: Libp2p.Connection) => void): callback after new connection is established.

#### peerDiscovery.onDiscover (handler)

On Discover handler, triggered after a new peer os discovered.

Parameters:
- `handler` ((peerId: PeerId) => void): callback after new peer is discovered.

#### peerDiscovery.handleProtocol(protocol handler: (props: Libp2p.HandlerProps) => void)

Handle listen protocol for libp2p node.

Parameters:
- `protocol` (string): The protocol name to listen to. eg. `/chat/1.0.0`.
- `handler` ((props: Libp2p.HandlerProps) => void): Callback after protocol is negotiated.

### zStore

Class to handle Peer Discovery, connections and protocols by libp2p node

#### zStore.init()

Initializes storage for zChain. We use [`orbitdb`](https://github.com/orbitdb/orbit-db) (a serverless, distributed, peer-to-peer database.) as our primary database. The store is initialized at `~/.zchain-db/<peer-id>`

During initialization we load the follwing databases:
+ open and load the feed database (your local messages feed).
+ open and load the local address book db.

#### zStore.appendZChainMessageToFeed(feedStore, message, channels)

Appends a new zchain message to the local feed.

Parameters:
- `feedStore` (string): The feed store (orbitdb database) to append the message to.
- `message` (string): The message.
- `channels` (string[]): Array of channels (if same message is published on multiple channels, this should be passed).

#### zStore.listMessagesOnFeed(peerIdStr, n)

Lists last "n" messages published by a node. Loads last "n" entry from the local feed database, and logs them.

Parameters:
- `peerIdStr` (string): Peer ID as base58-encoded string.
- `n` (number): Number of messages to display.