import parseDuration from 'parse-duration'

export default {
  command: 'local',

  describe: 'List local addresses',

  builder: {
    timeout: {
      type: 'string',
      coerce: parseDuration
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../../types').Context} argv.ctx
   * @param {number} argv.timeout
   */
  async handler ({ ctx: { print, ipfs }, timeout }) {
    const res = await ipfs.swarm.localAddrs({
      timeout
    })
    res.forEach(addr => print(addr.toString()))
  }
}
