export default {
  command: 'follow <topic>',

  describe: 'Follow a topic (#hashtag)',

  builder: {
    topic: {
      type: 'string',
      describe: 'topic to subscribe. Eg. #wilders'
    }
  },

  /**
   * @param {object} argv
   * @param {import('../../types').Context} argv.ctx
   * @param {Uint8Array} argv.topic
   */
  async handler ({ ctx: { meow }, topic }) {
    await meow.followTopic(topic);
  }
}
