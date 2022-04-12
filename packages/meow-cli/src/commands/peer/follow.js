export default {
  command: 'follow <peerId-or-name>',

  describe: 'Follow a peer (#zId)',

  builder: {
    peerIdOrName: {
      type: 'string',
      describe: 'peerId/name string to follow'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.peerIdOrName
   */
  async handler ({ ctx: { meow }, peerIdOrName }) {
    await meow.followZId(peerIdOrName);
  }
}
