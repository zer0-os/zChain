export default {
  command: 'feed <channel> <n>',

  describe: 'Display last n messages published on channel',

  builder: {
    channel: {
      type: 'string',
      describe: '#hashtag'
    },
    n: {
      type: "number",
      describe: "no. of messages to display"
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {string} argv.channel
   * @param {number} argv.n
   */
  async handler ({ ctx: { meow }, channel, n }) {
    await meow.displayChannelFeed(channel, n);
  }
}
