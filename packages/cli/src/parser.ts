import yargs from 'yargs'
import { pathHelp, disablePrinting } from './utils.js'
import { commandList } from './commands/index.js'

const args = yargs(process.argv.slice(2))
  .option('silent', {
    desc: 'Write no output',
    type: 'boolean',
    default: false,
    coerce: silent => {
      if (silent) disablePrinting()
      return silent
    }
  })
  .epilog(pathHelp)
  .demandCommand(1, 'Please specify a command')
  .showHelpOnFail(false)
  // @ts-ignore types are wrong
  .command(commandList)
  .help()
  .strict()
  //.completion()

export default args
