export default {
  command: 'unfollow <topic>',

  describe: 'Unfollow a topic (#hashtag)',

  builder: {
    topic: {
      type: 'string',
      describe: 'topic to unsubscribe. Eg. #wilders'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.topic
   */
  async handler ({ ctx: { meow }, topic }) {
    await meow.unFollowTopic(topic);
  }
}
