import { commands } from './peer/index'

export default {
  command: 'peer <command>',

  description: 'Peer commands',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs

      .command(commands)
  }
}
