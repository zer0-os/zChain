export default {
  command: 'follow <peerId>',

  describe: 'Follow a peer (#zId)',

  builder: {
    peerId: {
      type: 'string',
      describe: 'peerId string to follow'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.peerId
   */
  async handler ({ ctx: { meow }, peerId }) {
    await meow.followZId(peerId);
  }
}
