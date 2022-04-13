import { commands } from './swarm/index'

export default {
  command: 'swarm <command>',

  description: 'Swarm inspection tool.',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      .command(commands)
  }
}
