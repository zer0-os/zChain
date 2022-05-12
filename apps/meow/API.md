# Meow API Documentation

API documentation for meow. Meow is a twitter like (but peer to peer) application built on top of `zChain`. This means that the application "extends" upon the zChain core functionality in terms of message passing and persistance accross nodes.


## Table of Contents

<!-- toc -->

- [Initialize a meow](#initialize-a-meow)
  * [init(fileNameOrPath?, listenAddrs?)](#initfilenameorpath-listenaddrs)
- [Public Instance Methods](#public-instance-methods)
  * [meow.startDaemon(fileNameOrPath?, listenAddrs?)](#meowstartdaemonfilenameorpath-listenaddrs)
  * [meow.load()](#meowload)
  * [meow.sendMeow(message, publishOnTwitter = false)](#meowsendmeowmessage-publishontwitter--false)
  * [meow.set(peerId, name)](#meowsetpeerid-name)
  * [meow.followZId(peerIdOrName)](#meowfollowzidpeeridorname)
  * [meow.unfollowZId(peerIdOrName)](#meowunfollowzidpeeridorname)
  * [meow.getPeerFeed(peerIdOrName, n)](#meowgetPeerFeedpeeridorname-n)
  * [meow.getFollowedPeers()](#meowgetFollowedPeers)
  * [meow.followChannel(channel)](#meowfollowchannelchannel)
  * [meow.unFollowChannel(channel)](#meowunfollowchannelchannel)
  * [meow.getFollowedChannels()](#meowgetFollowedChannels)
  * [meow.getChannelFeed(channel, n)](#meowgetChannelFeedchannel-n)
  * [meow.listDBs()](#meowlistdbs)
  * [meow.enableTwitter(force)](#meowenabletwitterforce)
  * [meow.disableTwitter()](#meowdisabletwitter)
  * [meow.help()](#meowhelp)


<!-- tocstop -->

## Initialize a meow

### init(fileNameOrPath, listenAddrs)
```javascript
const meow = new MEOW();
await meow.init('node-a.json', [ '/ip4/0.0.0.0/tcp/0', .. ]);
```

Under the hood it's using the `zchain.initialize(..)` method to initialize an ipfs node and the databases. Check `zChain.initialize()` method in zchain API documentation for more details. Along with initializing zChain, we:
+ Intialize the meow storage (built/extended on top of zChain storage)
+ Intialize twitter client (if enabled)
+ Logic for new connections :: In every 10s (`setInterval`) try to find & connect with new peers (using a relay)
+ Logic for following/unfollowing peer :: After connecting, check in the database if we're following this peer, if yes, then open a connection stream and request it's feed db address.



## Public Instance Methods

### meow.startDaemon(fileNameOrPath?, listenAddrs?)

Runs `zchain.startDaemon()`. After which we log the discovery and connections, and listen for new messages (to topics we have been subscribed to). This is specific to the CLI right now.

```js
const meow = new MEOW();
const daemon = await meow.startDaemon(path.join(os.homedir(), '/.jsipfs', 'peer.json'));
```

### meow.load()

Connects to the ipfs daemon and **loads** the databases. Specific to the CLI right now.


### meow.sendMeow(message, publishOnTwitter = false)

Send a meow (a message), across hashtags. By default each message is published on `#everything` channel. A node will receive all messages if it's follwing the `#everything` channel (becoming a super node). Additionally, if twitter is enabled, then the message will also be published on `#zero` channel.

Parameters:
- `message` (string): The message to publish.
- `publishOnTwitter` (boolean, optional): This is set to false by default. If twitter is enabled and this is set to `true`, then the message will also be published on twitter.

```js
// publishes message on #fairtoplay, #ucl, #everything
await meow.sendMeow(`Thrilled to join the football gaming revolution
with @UFLgame bringing the new #fairtoplay experience to
football gamers worldwide! See you in the Game soon! #ucl`);
```


### meow.set(peerId, name)

Sets a name of the peerId in the local address book.

Parameters:
- `peerId` (string): The peerID (as base58 encoded string).
- `name` (string): Display name to set for this peerID.

```js
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';

  // set display name for ratik peerID in local address book
  await meow.set(ratikId, "ratik");
```

### meow.followZId(peerIdOrName)

Follow a zId (peerID). After you follow a peer, an entry is saved to `followingzIds` databases. And upon establishing connection with the peer you follow, we exchange that peer's (unique) database address (it's local feed database). This way we sync up on the messages published by that peer (as we have a local copy of it's peer database now).

Parameters:
- `peerIdOrName` (string): The peerID (as base58 encoded string) or the display name from the local address book.

```js
  // follow ratik
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';
  await meow.followZId(ratikId);

  // or follow by name
  await meow.set(ratikId, "ratik"); // set in local address book
  await meow.followZId("ratik");
```


### meow.unfollowZId(peerIdOrName)

Unfollow a zId (peerID). After you unfollow a peer, entry of the peer is removed from `followingZIds` database, and local feed database of the peer we have unfollowed is dropped.

Parameters:
- `peerIdOrName` (string): The peerID (as base58 encoded string) or the display name from the local address book.

```js
  // unfollow ratik
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';
  await meow.unfollowZId(ratikId);

  // or unfollow by name
  await meow.set(ratikId, "ratik"); // set in local address book
  await meow.unfollowZId("ratik");
```

### meow.getPeerFeed(peerIdOrName, n)

Displays last "n" messages published by a peer. Please **note** that you must be "following" the peer and established connection to it atleast once (so that you have that peer's feed unique database address).

Parameters:
- `peerIdOrName` (string): The peerID (as base58 encoded string) or the display name from the local address book.
- `n` (number): Number of messages to display.

```js
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';
  await meow.set(ratikId, "ratik"); // set in local address book

  // display last 5 messages followed by ratik
  await meow.getPeerFeed("ratik", 5);
```

### meow.getFollowedPeers()

Returns the peers(zId's) this node is following. If a display name is set for any peer, that will be returned as well.

```js
  // list following peers
  const peers = meow.getFollowedPeers();
  console.log('peers: ', peers);
```

### meow.followChannel(channel)

Follow a channel. After following a channel, any message published on that channel will be received by this node. You also open & load the public (orbitdb) database of this channel, so that you receive/replicate the persisted messages even when the node goes offline.

Parameters:
- `channel` (string): Name of the channel to follow

```js
  // follow a channel
  await meow.followChannel('#fairtoplay');
```

### meow.unFollowChannel(channel)

Unfollow a channel. After unfollowing a channel, you will no longer receive any message published on that channel. The public database of that channel is also dropped from the local system.

Parameters:
- `channel` (string): Name of the channel to unfollow

```js
  // unfollow a channel
  await meow.unFollowChannel('#fairtoplay');
```

### meow.getFollowedChannels()

Returns a list of the channels this node is following.

```js
  // list the channels this node is following
  const channels = meow.getFollowedChannels();
  console.log('channels: ', channels);
```

### meow.getChannelFeed(channel, n)

Returns last "n" messages published "on" a channel. Please **note** that you must be "following" the channel in order to view it's feed.

Parameters:
- `channel` (string): Name of the channel to display feed of.
- `n` (number): Number of messages to display.

```js
  // display last 3 messages on channel #ucl
  const feed = await meow.getChannelFeed('#ucl', 3);
  console.log('Channel Feed: ', feed);
```

### meow.listDBs()

Lists all the databases in an object, with their respective orbit-db addresses and the no. of entries. Databases listed are:
+ `followingZIds`: key value store for storing following peers
+ `followingChannels`: key value store for storing the channels we're following.
+ `Peer Feeds`: List of feed databases (address, entries) for each peer we're following.
+ `Channel feeds`: List of channel databases (address, entries) for each channel we're following.

```js
  await meow.listDBs()
```


### meow.enableTwitter(force)

Enables twitter. A window is open first on the browser, where the user is asked to authorize meow app to tweet of behalf of the user. After authorization by user, the meow app has read & write permissions for tweets from your twitter account. The config for twitter account is saved at `~/.jsipfs/twitter-config.json`.

If you want to "tweet" from a `meow`, pass `true` with `sendMeow` function (eg below).

Parameters:
- `force` (boolean): If passed, user is asked to authorize again.

```js
  await meow.enableTwitter();

  // send message to zchain + post a tweet to twitter.
  await meow.sendMeow("post from zchain", true);
```

### meow.disableTwitter()

Disables twitter. Simply removes config at `~/.jsipfs/twitter-config.json`

```js
  await meow.disableTwitter();
```

### meow.help()

Displays a list of available functions withing the meow API.