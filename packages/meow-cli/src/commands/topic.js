import { commands } from './topic/index.js'

export default {
  command: 'topic <command>',

  description: 'Topic commands',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      // @ts-expect-error types are wrong
      .command(commands)
  }
}
