export default {
  command: 'set <peerId> <name>',

  describe: 'Set name for a peerId in addressBook',

  builder: {
    peerId: {
      type: 'string',
    },
    name: {
      type: 'string',
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.peerId
   * @param {string} argv.name
   */
  async handler ({ ctx: { meow }, peerId, name }) {
    await meow.set(peerId, name);
  }
}
