export default {
  command: 'sendmeow <data>',

  describe: 'Send a meow',

  builder: {
    data: {
      type: 'string',
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.data
   */
  async handler ({ ctx: { ipfs, meow }, data }) {
    await meow.sendMeow(data);
  }
}


