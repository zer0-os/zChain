import os from 'os';
import fs from 'fs';
import path from 'path';
import { ipfsPathHelp } from '../utils.js'
import { MEOW } from "../../../../apps/meow/build/index.js";

export default {
  command: 'daemon',

  describe: 'Start a long-running daemon process',

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
      // .option('offline', {
      //   type: 'boolean',
      //   desc: 'Run offline. Do not connect to the rest of the network but provide local API.',
      //   default: false
      // })
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
    print('Initializing IPFS daemon...')
    print(`System version: ${os.arch()}/${os.platform()}`)
    print(`Node.js version: ${process.versions.node}`)

    // remove existing config if --force is passed
    if (argv.force) {
      fs.rmSync(path.join(os.homedir(), '/.jsipfs'), {force: true, recursive: true});
      fs.rmSync(path.join(os.homedir(), '/.zchain-db'), {force: true, recursive: true});
    }

    try {
      const meow = new MEOW();
      const daemon = await meow.startDaemon(argv.zid ?? path.join(os.homedir(), '/.jsipfs', 'peer.json'));

      const version = await daemon._ipfs.version()
      print(`meow-cli ipfs node version: ${version.version}`)

      if (daemon._httpApi && daemon._httpApi._apiServers) {
        daemon._httpApi._apiServers.forEach(apiServer => {
          print(`HTTP API listening on ${apiServer.info.ma}`)
        })
      }

      // @ts-ignore - _httpGateway is possibly undefined
      if (daemon._grpcServer && daemon._grpcServer) {
        print(`gRPC listening on ${daemon._grpcServer.info.ma}`)
      }

      if (daemon._httpGateway && daemon._httpGateway._gatewayServers) {
        daemon._httpGateway._gatewayServers.forEach(gatewayServer => {
          print(`Gateway (read only) listening on ${gatewayServer.info.ma}`)
        })
      }

      // if (daemon._httpApi && daemon._httpApi._apiServers) {
      //   daemon._httpApi._apiServers.forEach(apiServer => {
      //     print(`Web UI available at ${toUri(apiServer.info.ma)}/webui`)
      //   })
      // }
    } catch (/** @type {any} */ err) {
      if (err.code === 'ERR_REPO_NOT_INITIALIZED' || err.message.match(/uninitialized/i)) {
        err.message = 'no initialized ipfs repo found in ' + repoPath + '\nplease run: jsipfs init'
      }
      throw err
    }

    print('Daemon is ready')

    const cleanup = async () => {
      print('Received interrupt signal, shutting down...')
      //await daemon.stop()
      process.exit(0)
    }

    // listen for graceful termination
    process.on('SIGTERM', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGHUP', cleanup)
  }
}
