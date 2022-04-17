import { commands } from './channel/index.js'

export default {
  command: 'channel <command>',

  description: 'Channel commands',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      .command(commands)
  }
}
