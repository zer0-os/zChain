export default {
  command: 'feed <peerId> <n>',

  describe: 'Display last n messages published by a peer',

  builder: {
    peerId: {
      type: 'string',
      describe: 'peer id'
    },
    n: {
      type: "number",
      describe: "no. of messages to display"
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.peerId
   * @param {number} argv.n
   */
  async handler ({ ctx: { meow }, peerId, n }) {
    await meow.displayFeed(peerId, n);
  }
}
