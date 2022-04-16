export default {
  command: 'ls',

  describe: 'List the topics followed by this zChain node',

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   */
  async handler ({ ctx: { meow } }) {
    meow.listFollowedTopics();
  }
}
