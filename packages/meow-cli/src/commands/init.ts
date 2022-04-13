import os from 'os';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ipfsPathHelp } from '../utils'
import { MEOW } from "meow-app";

export default {
  command: 'init',

  describe: 'Initializes a new zChain node at ~/.jsipfs',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      .epilog(ipfsPathHelp)
      .option('zid', {
        type: 'string',
        desc: 'Path to zId configuration file (contains peer metadata)',
      })
      .option('force', {
        type: 'boolean',
        desc: 'If true, removes any previos config present at ~/.jsipfs & ~/.zchain-db',
        default: false
      })
      .demandOption('zid')
  },

  /**
   * @param {object} argv
   * @param {import('../types').Context} argv.ctx
   * @param {string} [argv.zid]
   * @param {boolean} argv.silent
   * @param {boolean} argv.force
   */
  async handler (argv) {
    const { print, repoPath } = argv.ctx
    print(`Initializing IPFS node at ${repoPath}...`)
    print(`System version: ${os.arch()}/${os.platform()}`)
    print(`Node.js version: ${process.versions.node}`)

    // remove existing config if --force is passed
    if (argv.force) {
      fs.rmSync(path.join(os.homedir(), '/.jsipfs'), {force: true, recursive: true});
      fs.rmSync(path.join(os.homedir(), '/.zchain-db'), {force: true, recursive: true});
    }

    try {
      if (fs.existsSync(path.join(os.homedir(), '/.jsipfs'))) {
        console.warn(chalk.yellow(`zChain node config already present at ~/.jsipfs. Use --force to override`));
      } else {
        const meow = new MEOW();
        //await meow.initCLI(argv.zid);

        // save peer json path
        fs.writeFileSync(
          path.join(os.homedir(), '/.jsipfs', 'zId'),
          argv.zid
        );
      }

    } catch (/** @type {any} */ err) {
      if (err.code === 'EACCES') {
        err.message = 'EACCES: permission denied, stat $IPFS_PATH/version'
      }
      throw err
    }
  }
}
