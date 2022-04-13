export default {
  command: 'unfollow <peerId-or-name>',

  describe: 'UnFollow a peer (#zId)',

  builder: {
    peerIdOrName: {
      type: 'string',
      describe: 'peerId/name string to unfollow'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.peerIdOrName
   */
  async handler ({ ctx: { meow }, peerIdOrName }) {
    await meow.unfollowZId(peerIdOrName);
  }
}
