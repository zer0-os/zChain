import yargs from 'yargs'
import { ipfsPathHelp, disablePrinting } from './utils'
import { commandList } from './commands/index'

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
  .epilog(ipfsPathHelp)
  .demandCommand(1, 'Please specify a command')
  .showHelpOnFail(false)
  // @ts-ignore types are wrong
  .command(commandList)
  .help()
  .strict()
  //.completion()

export default args
