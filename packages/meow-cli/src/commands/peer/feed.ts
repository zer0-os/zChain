export default {
  command: 'feed <peerId-or-name> <n>',

  describe: 'Display last n messages published by a peer',

  builder: {
    peerIdOrName: {
      type: 'string',
      describe: 'peer id or name'
    },
    n: {
      type: "number",
      describe: "no. of messages to display"
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.peerIdOrName
   * @param {number} argv.n
   */
  async handler ({ ctx: { meow }, peerIdOrName, n }) {
    await meow.getPeerFeed(peerIdOrName, n);
  }
}
