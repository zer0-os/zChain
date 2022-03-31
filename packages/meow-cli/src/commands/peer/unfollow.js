export default {
  command: 'unfollow <peerId>',

  describe: 'UnFollow a peer (#zId)',

  builder: {
    peerId: {
      type: 'string',
      describe: 'peerId string to unfollow'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.peerId
   */
  async handler ({ ctx: { meow }, peerId }) {
    await meow.unFollowZId(peerId);
  }
}
