export default {
  command: 'unfollow <channel>',

  describe: 'Unfollow a channel (#hashtag)',

  builder: {
    channel: {
      type: 'string',
      describe: 'channel to unsubscribe. Eg. #wilders'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.channel
   */
  async handler ({ ctx: { meow }, channel }) {
    await meow.unFollowChannel(channel);
  }
}
