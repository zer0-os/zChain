'use strict'

const PeerId = require('peer-id');
const createLibp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const { NOISE } = require('libp2p-noise');
const MPLEX = require('libp2p-mplex');

async function run() {
  const dialerId = await PeerId.createFromJSON(require('./id-d'));

  // Dialer
  const dialerNode = await new createLibp2p({
    modules: {
      transport: [ TCP ],
      streamMuxer: [MPLEX],
      connEncryption: [ NOISE ]
    },
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    peerId: dialerId
  });

  // Add peer to Dial (the listener) into the PeerStore
  const listenerMultiaddr = '/ip4/127.0.0.1/tcp/53800/p2p/QmTLQdZzM99MsEsxJPmPvawjKEa28STCc63eC4xsuaB9gy';

  // Start the dialer libp2p node
  await dialerNode.start();

  console.log('Dialer ready, listening on:')
  dialerNode.multiaddrs.forEach((ma) => console.log(ma.toString() + '/p2p/' + dialerId.toB58String()));

  // Dial the listener node
  console.log('Dialing to peer:', listenerMultiaddr);
  const { stream } = await dialerNode.dialProtocol(listenerMultiaddr, '/chat/1.0.0');
}

run();