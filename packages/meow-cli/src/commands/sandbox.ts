import { ipfsPathHelp } from '../utils'
import repl from "repl";
import chalk from "chalk";
import { runInNewContext } from "vm";
import { MEOW } from 'meow-app';
import os from 'os';
import fs from 'fs';
import path from 'path';
import delay from 'delay';

// handle top level await
export function preprocess(input: string): string {
	const awaitMatcher = /^(?:\s*(?:(?:let|var|const)\s)?\s*([^=]+)=\s*|^\s*)(await\s[\s\S]*)/;
	const asyncWrapper = (code: string, binder: string): string => {
		const assign = binder ? `global.${binder} = ` : "";
		return `(function(){ async function _wrap() { return ${assign}${code} } return _wrap();})()`;
	};

	// match & transform
	const match = input.match(awaitMatcher);
	if (match) {
		input = `${asyncWrapper(match[2], match[1])}`;
	}
	return input;
}

// check if repl error is recoverable
export function isRecoverableError(error: Error): boolean {
	if (error.name === "SyntaxError") {
		return /^(Unexpected end of input|Unexpected token)/.test(error.message);
	}
	return false;
}

// handles top level await by preprocessing input and awaits the output before returning
async function evaluate(
	code: string,
	context: object,
	filename: string,
	callback: (err: Error | null, result?: object) => void
): Promise<void> {
	try {
		const result = await runInNewContext(preprocess(code), context);
		callback(null, result);
	} catch (e) {
		if (e instanceof Error && isRecoverableError(e)) {
			callback(new repl.Recoverable(e));
		} else {
			console.error(e);
			callback(null);
		}
	}
}

async function startConsole(fileNameOrPath: string): Promise<void> {
	await new Promise<void>(async (resolve, reject) => {

    // // log to a ~/zchain.log file, instead of console
    // const logFile = fs.createWriteStream(os.homedir() + '/zchain.log', {flags : 'a'});
    // console.log = function(...args) {
    //   if (String(args[0]).includes('Swarm') || String(args[0]).includes('★') || String(args[0]).includes('Try typing')) {
    //     console.info(args.join(''))
    //   }

    //   args = [`[${(new Date()).toISOString()}] `].concat(args);
    //   const logs = args.join('');
    //   logFile.write(util.format(logs) + '\n');
    // };

    const meow = new MEOW();
    await meow.init(fileNameOrPath);

		console.log("★", chalk.cyan(" Welcome to meow console "), "★");
		meow.help();

		console.log(chalk.green(`Try typing: meow.sendmeow("Hello World")\n`));

		await delay(6 * 1000);
		const server = repl.start({
			prompt: chalk.cyan("meow> "),
			eval: evaluate,
		});

		// assign repl context
		server.context.meow = meow;
		server.context.ipfs = meow.zchain.ipfs;

		server.on("exit", async () => {
      await meow.zchain.zStore.orbitdb.disconnect();
			resolve();
		});
	});
}

export default {
  command: 'sandbox',

  describe: 'Opens up an interactive playground with meow global object',

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
  },

  /**
   * @param {object} argv
   * @param {import('../types').Context} argv.ctx
   */
  async handler (argv) {
    // remove existing config if --force is passed
    if (argv.force) {
      fs.rmSync(path.join(os.homedir(), '/.jsipfs'), {force: true, recursive: true});
      fs.rmSync(path.join(os.homedir(), '/.zchain-db'), {force: true, recursive: true});
    }

    await startConsole(argv.zid ?? path.join(os.homedir(), '/.jsipfs', 'peer.json'));
  }
}
