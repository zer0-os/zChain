import { commands } from './topic/index'

export default {
  command: 'topic <command>',

  description: 'Topic commands',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs

      .command(commands)
  }
}
