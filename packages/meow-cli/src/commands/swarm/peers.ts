import mafmt from 'mafmt'
import { Multiaddr } from 'multiaddr'
import parseDuration from 'parse-duration'

export default {
  command: 'peers',

  describe: 'List peers with open connections',

  builder: {
    timeout: {
      type: 'string',
      coerce: parseDuration
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {number} argv.timeout
   */
  async handler ({ ctx: { print, ipfs }, timeout }) {
    const result = await ipfs.swarm.peers({
      timeout
    })

    result.forEach((item) => {
      let ma = new Multiaddr(`${item.addr}`)

      if (!mafmt.IPFS.matches(ma)) {
        ma = ma.encapsulate(`/ipfs/${item.peer}`)
      }

      print(`${ma}`)
    })
  }
}
