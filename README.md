# zChain

A zChain is a chain of Messages. Each Message contains a hash as a reference to the prior Message in the chain, that can be used to reconstruct the chain back to the initial Message. A zChain node is essentially a [libp2p](https://github.com/libp2p/js-libp2p) node (at `~/.zchain/`), where messaging relies on libp2p pubsub (gossipsub) system. Messages are ordered using crdt (conflict free resolution data types) using [yjs](https://github.com/yjs/yjs), which means that even if you're offline, the messages are appended to the chain in the correct order, when you go online and sync with the network. Messages on zchain are persisted, i.e your local messages are stored on your system. We are using [level-db](https://github.com/google/leveldb) as our primary database for storing data.

So, main design components for zchain include:
+ [libp2p](https://github.com/libp2p/js-libp2p): networking stack. PeerId is stored at `~/.zchain/zId/<node-name>`
+ [yjs](https://github.com/yjs/yjs): CRDT
+ [level-db](https://github.com/google/leveldb): Local Storage. Data is stored at `~/.zchain/db/<node-name>`

## Requirements

+ Node 14+
+ Yarn `v1.2+`. Use `npm install -g yarn` to install `yarn`
+ Git

## Setup

First clone the git repo:
```sh
git clone https://github.com/zer0-os/zChain.git
cd zChain/
```

### Linux

After cloning the git repo, simply run:
```sh
sh install.sh
```

This shell script will install, build and link all the packages. Try running `meow --help` to check if the installation was proper. You should see something like:

![image](https://user-images.githubusercontent.com/33264364/165640076-fe28e4d3-83a1-48da-9bc7-72ef58dc6ad8.png)

### Windows

For installation on windows, check out this great infographic posted by [0://wilder.LΘΤΣΝΣ](https://twitter.com/_LOTENE), [here](https://twitter.com/_LOTENE/status/1520865654533988354).


### MacOS

**NOTE:** For *macOS* users, it is recommended to use `nvm` to install and use nodejs instead of `brew`. Follow [this](https://medium.com/@lucaskay/install-node-and-npm-using-nvm-in-mac-or-linux-ubuntu-f0c85153e173) tutorial to setup `nvm` on mac/linux. If you're getting `nvm: command not found` after running the curl, simply do `source ~/.zshrc` (or mac), or `source ~/.bashrc` (on linux). Make sure **not** to install nodejs using sudo.

#### Intel based macs (*not m1* )

For intel chip macs, you can follow the same steps for `linux` setup, i.e simply run `install.sh` after cloning the repo. If you're getting a permission denied issue, you likely installed nodejs with sudo. Follow the comment in above section to reinstall node using `nvm`.

#### M1 macs (ARM architecture)

For `m1` chip macs, the installation/running zchain can be a bit tricky. There are some dependencies which are incompatible with the mac arm architecture, specifically `wrtc`. (open) Issue can be found [here](https://github.com/node-webrtc/node-webrtc/issues/698).

To install and run zchain we'll need to switch the architecture from `arm` to `x64`. And then we will continue with the setup. Steps:

+ Switch architecture from `arm` to `x64`
  ```sh
  arch -x86_64 zsh
  ```

+ Confirm the "current" architure you're on by running
  ```
  arch
  ```
  This should return `x64`/`i3`/`i9`..

+ Install nodejs using `nvm`. We'll install nodev16 (**not** 18). This is because of incompatibility with the latest node with m1.
  ```
  // run install script
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

  // reload terminal
  source ~/.zshrc

  // install node v16
  nvm install 16

  // use nodev16
  nvm use 16
  ```

+ Confirm the nodejs installation by running `node -v && npm -v` and checking the respective versions of node and npm.

+ Now, we can clone the repo and setup zchain (similar to other OS setups):
  ```sh
  git clone https://github.com/zer0-os/zChain.git
  cd zChain/
  sh install.sh
  ```

Try running `meow --help` to check if the installation was proper.

**NOTES:**
+ After running zchain, don't forget the "exit" the `x64` architecture. Simply run `exit` on the terminal, to get back to `arm` arch.
+ Currently this installation does **not** guarantee that zchain will run on m1 macs successfully. On some m1's it was able to run zchain after following the steps above. So for now this is still a *wip*.


## Clean

To remove *node_modules* & all *build/* folders run
```sh
sh clean.sh
```

## Quick Start

To quickly get up a node up & running, you can start up the sandbox. It has the zChain (libp2p) node initialized within the `meow` global var (present in the execution environment of the REPL):
```sh
# clone + setup
git clone <zChain-repo-git-url>
sh install.sh

# run the sandbox
meow sandbox
```

The screen should look something like this:
![image](https://user-images.githubusercontent.com/33264364/165646660-fdf65586-f324-48ca-bd02-6dea50996e75.png)

You can run another node, on another terminal screen (using `meow sandbox` again, and select the option "*Initialize a new node*"). Then those two nodes can interact with each other.

## Docker 

To setup and start the project using docker, simply execute the bash script `docker.sh`:
```bash
bash docker.sh
```

It will build the docker image, install dependencies, build the typescript project and launch an interactive shell in a docker container.


## Packages

The repo has mainly been divided into 3 packages

+ `packages/zchain-core`: Contains code for core zChain package (library).
+ `packages/apps/meow`: A meow app (p2p twitter like) built on top of zChain.
+ `packages/meow-cli`: CLI for meow app. Currently supports only the "sandbox" command.

## Usage

You can import `zChain` or `meow` as a library/class and directly use it. First, you'll need to link these packages in your application. First follow the setup:

```sh
# clone + setup
git clone https://github.com/zer0-os/zChain.git
sh install.sh
```

You can then link the `zchain-core` & `meow-app` into your project. This will create a symbolic link b/w your *node_modules* and the `zchain` & `meow` package:
```sh
cd myapp/
yarn link `zchain-core`
yarn link `meow-app`
```

After linking the packages, you can simply import these classes:
```js
// using zChain
import { ZCHAIN } from "zchain-core";
let node_a = new ZCHAIN();
await node_a.initialize('node-1.json');
await node_a.publish('#meow', 'Bird bird bird, bird is the word!');

// using meow
import { MEOW } from "meow-app";
const meow = new MEOW();
await meow.init('n3o.json');
await meow.sendMeow("Hello");
```

## API

For a more technical overview of zChain and meow functionality, checkout API docs hosted on gitbook.
+ [zChain API](https://www.zero.study/zchain/api/zchain)
+ [meow API](https://www.zero.study/zchain/api/meow)