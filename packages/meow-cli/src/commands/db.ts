import { zChainPathHelp } from '../utils'

export default {
  command: 'dbs',

  describe: 'Lists all databases with no. of entries',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      .epilog(zChainPathHelp)
  },

  /**
   * @param {object} argv
   * @param {import('../types').Context} argv.ctx
   */
  async handler (argv) {
    const { meow } = argv.ctx
    await meow.listDBs();
  }
}
