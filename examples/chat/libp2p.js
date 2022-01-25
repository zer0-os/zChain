'use strict'

import TCP from 'libp2p-tcp'
import WS from 'libp2p-websockets'
import { NOISE } from '@chainsafe/libp2p-noise'
import defaultsDeep from '@nodeutils/defaults-deep'
import libp2p from 'libp2p'
import mplex from 'libp2p-mplex'

export default async function createLibp2p(_options) {
  const defaults = {
    modules: {
      transport: [TCP, WS],
      streamMuxer: [mplex],
      connEncryption: [NOISE],
    },
  }

  return libp2p.create(defaultsDeep(_options, defaults))
}