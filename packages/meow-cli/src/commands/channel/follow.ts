export default {
  command: 'follow <channel>',

  describe: 'Follow a channel (#hashtag)',

  builder: {
    channel: {
      type: 'string',
      describe: 'channel to subscribe. Eg. #wilders'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.channel
   */
  async handler ({ ctx: { meow }, channel }) {
    await meow.followChannel(channel);
  }
}
