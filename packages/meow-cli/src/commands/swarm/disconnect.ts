import {
  coerceMultiaddr
} from '../../utils'

export default {
  command: 'disconnect <address>',

  describe: 'Close connection to a given address',

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
    await ipfs.swarm.disconnect(address)

    print(`${address}`)
  }
}
