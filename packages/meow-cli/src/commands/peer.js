import { commands } from './peer/index.js'

export default {
  command: 'peer <command>',

  description: 'Peer commands',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      // @ts-expect-error types are wrong
      .command(commands)
  }
}
