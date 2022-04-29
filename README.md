# zChain

A zChain is a chain of Messages. Each Message contains a hash as a reference to the prior Message in the chain, that can be used to reconstruct the chain back to the initial Message. A zChain node is essentially an [ipfs](https://github.com/ipfs/js-ipfs) node (at `~/.jsipfs/<peer-id>`), where messaging relies on ipfs pubsub (gossipsub) system. But with persistence, i.e your local messages are stored on your system. We are using [orbit-db](https://github.com/orbitdb/orbit-db) (a serverless, distributed, peer-to-peer database) for storing data.

## Setup

After cloning the git repo, simply run:
```sh
sh install.sh
```

This shell script will install, build and link all the packages. Try running `meow --help` to check if the installation was proper. You should see something like:

![image](https://user-images.githubusercontent.com/33264364/165640076-fe28e4d3-83a1-48da-9bc7-72ef58dc6ad8.png)

**NOTE**: If you're getting *Permission denied* error on the bin file, simply do
```sh
chmod +x <path-to-file>
```

To remove *node_modules* & all *build/* folders run
```sh
sh clean.sh
```

## Quick Start

To quickly get up a node up & running, you can start up the sandbox. It has the zChain (ipfs) node initialized within the `meow` global var (present in the execution environment of the REPL):
```sh
# clone + setup
git clone <zChain-repo>
sh install.sh

# run the sandbox
meow sandbox
```

The screen should look something like this:
![image](https://user-images.githubusercontent.com/33264364/165646660-fdf65586-f324-48ca-bd02-6dea50996e75.png)

You can run another node, on another terminal screen (using `meow sandbox` again). Then those two nodes can interact with each other.

**NOTE**: Each time you run `meow sandbox` it will spawn up a new node and database. If you want to connect to an existing node with a peerID, pass the `--zId` flag with path to the peerID json. Eg.
```sh
meow sandbox --zId ~/.jsipfs/QmdtyPhSdzDKDXHKSpJPwBwnK4b1ZqbYuRjZaUNzYPih5w/peer.json
```

This will launch the sandbox with previously connected (`<QmdtyPhSdzDKDXHKSpJPwBwnK4b1ZqbYuRjZaUNzYPih5w>`) node.

## Packages

The repo has mainly been divided into 3 packages

+ `packages/zchain-core`: Contains code for core zChain package (library).
+ `packages/apps/meow`: A meow app (p2p twitter like) built on top of zChain.
+ `packages/meow-cli`: CLI for meow app.

## API

For a more technical overview of zChain and meow functionality, checkout API docs.
+ [zChain API]()
+ [meow API]()