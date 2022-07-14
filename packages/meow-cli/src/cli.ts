#!/usr/bin/env node

/* eslint-disable no-console */

/**
 * Handle any uncaught errors
 *
 * @param {any} err
 * @param {string} [origin]
 */
import semver from 'semver'
import * as pkg from './package'
import debug from 'debug'

import { cli } from "./index.js";

import { loadMeow, print, getRepoPath } from './utils';
import { MEOW } from "meow-app";

/**
 * @param {any} err
 * @param {string} origin
 */
const onUncaughtException = (err, origin) => {
  if (!origin || origin === 'uncaughtException') {
    console.error(err)
    process.exit(1)
  }
}

/**
 * Handle any uncaught errors
 *
 * @param {any} err
 */
const onUnhandledRejection = (err) => {
  console.error(err)
  process.exit(1)
}

process.once('uncaughtException', onUncaughtException)
process.once('unhandledRejection', onUnhandledRejection)

if (process.env.DEBUG) {
  process.on('warning', err => {
    console.error(err.stack)
  })
}

const log = debug('meow:cli')

process.title = pkg.name

// Check for node version
if (!semver.satisfies(process.versions.node, pkg.node)) {
  console.error(`Please update your Node.js version to ${pkg.node}`)
  process.exit(1)
}


/**
 * @param {string[]} argv
 */
async function main (argv) {
  let exitCode = 0
  let meow: MEOW;
  let ctx = {
    print,
    meow,
    getStdin: () => process.stdin,
    repoPath: getRepoPath(),
    cleanup: () => {},
    isDaemon: false,
  }

  const command = argv.slice(2)

  try {
    const data = await cli(command, async (argv) => {
      if (!['daemon', 'init', 'sandbox', 'commands'].includes(command[0])) {
        // @ts-ignore argv as no properties in common
        const { meow, cleanup } = await loadMeow()

        ctx = {
          ...ctx,
          meow,
          cleanup
        }
      }

      argv.ctx = ctx

      return argv
    })

    if (data) {
      print(data)
    }
  } catch (/** @type {any} */ err) {
    // TODO: export errors from ipfs-repo to use .code constants
    if (err.code === 'ERR_INVALID_REPO_VERSION') {
      err.message = 'Incompatible repo version. Migration needed. Pass --migrate for automatic migration'
    }

    if (err.code === 'ERR_NOT_ENABLED') {
      err.message = `no IPFS repo found in ${ctx.repoPath}.\nplease run: 'ipfs init'`
    }

    // Handle yargs errors
    if (err.code === 'ERR_YARGS') {
      err.yargs.showHelp()
      ctx.print.error('\n')
      ctx.print.error(`Error: ${err}`)
    } else if (log.enabled) {
      // Handle commands handler errors
      log(err)
    } else {
      console.error(err)
    }

    exitCode = 1
  } finally {
    await ctx.cleanup()
  }

  if (command[0] === 'daemon' || command[0] === 'open') {
    // don't shut down the daemon process
    return
  }

  //process.exit(exitCode)
}

main(process.argv)
