export default {
  command: 'ls',

  describe: 'List the channels followed by this zChain node',

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   */
  async handler ({ ctx: { meow } }) {
    meow.listFollowedChannels();
  }
}
