import parseDuration from 'parse-duration'
import { coerceUint8Array } from '../../utils.js'

export default {
  command: 'feed <topic> <n>',

  describe: 'Display last n messages published on topic',

  builder: {
    topic: {
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
   * @param {string} argv.topic
   * @param {number} argv.n
   */
  async handler ({ ctx: { meow }, topic, n }) {
    await meow.displayTopicFeed(topic, n);
  }
}
