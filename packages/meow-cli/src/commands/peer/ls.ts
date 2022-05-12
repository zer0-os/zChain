export default {
  command: 'ls',

  describe: 'List the peers followed by this zChain node',

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   */
  async handler ({ ctx: { meow } }) {
    meow.getFollowedPeers();
  }
}
