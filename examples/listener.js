'use strict'
/* eslint-disable no-console */

import PeerId from 'peer-id';
import createLibp2p from './libp2p.cjs';
import { stdinToStream, streamToConsole } from './stream.js';

import * as listener_json from '../peer-id-listener.json' assert {type: "json"};

async function run () {
  // Create a new libp2p node with the given multi-address
  const idListener = await PeerId.createFromJSON(listener_json.default)
  const nodeListener = await createLibp2p({
    peerId: idListener,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10333']
    }
  })

  // Log a message when a remote peer connects to us
  nodeListener.connectionManager.on('peer:connect', (connection) => {
    console.log('connected to: ', connection.remotePeer.toB58String())
  })

  // Handle messages for the protocol
  await nodeListener.handle('/chat/1.0.0', async ({ stream }) => {
    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  })

  // Start listening
  await nodeListener.start()

  // Output listen addresses to the console
  console.log('Listener ready, listening on:')
  nodeListener.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + idListener.toB58String())
  })
}

run()