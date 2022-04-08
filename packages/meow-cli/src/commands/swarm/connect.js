import {
  coerceMultiaddr
} from '../../utils.js'

export default {
  command: 'connect <address>',

  describe: 'Open connection to a given address',

  builder: {
    address: {
      type: 'string',
      coerce: coerceMultiaddr
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {import('multiaddr').Multiaddr} argv.address
   */
  async handler ({ ctx: { ipfs, print }, address }) {
    await ipfs.swarm.connect(address, {
      timeout
    })

    print(`${address}`)
  }
}
