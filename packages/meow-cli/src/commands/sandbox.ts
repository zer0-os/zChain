import { zChainPathHelp } from '../utils'
import repl from "repl";
import chalk from "chalk";
import { runInNewContext } from "vm";
import { MEOW } from 'meow-app';
import os from 'os';
import fs from 'fs';
import path from 'path';
import delay from 'delay';
import enquirer from "enquirer";

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

async function startConsole(zIdName: string): Promise<void> {
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
    await meow.init(zIdName);

		console.log("★", chalk.cyan(" Welcome to meow console "), "★");
		meow.help();

		console.log(chalk.green(`Try typing: meow.sendMeow("Hello World")`));
		console.log(chalk.green(`Use meow.help() to see a list of all available functions\n`));

		await delay(6 * 1000);
		const server = repl.start({
			prompt: chalk.cyan("meow> "),
			eval: evaluate,
		});

		// assign repl context
		server.context.meow = meow;
		server.on("exit", async () => {
      // await meow.zchain.zStore.orbitdb.disconnect();
			resolve();
		});
	});
}

async function getNewName() {
	const response = await (enquirer as any).prompt({
		type: 'input',
		name: 'zIdName',
		message: 'Please type a name for your node'
	});

	return (response as any).zIdName;
}

export default {
  command: 'sandbox',

  describe: 'Opens up an interactive playground with meow global object',

  /**
   * @param {import('yargs').Argv} yargs
   */
  builder (yargs) {
    return yargs
      .epilog(zChainPathHelp)
      .option('force', {
        type: 'boolean',
        desc: 'If true, REMOVES any previos config present at ~/.zchain',
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
      fs.rmSync(path.join(os.homedir(), '/.zchain'), {force: true, recursive: true});
    }

		let name: string;
		const basePath = path.join(os.homedir(), '.zchain', 'zId');
		if (!fs.existsSync(basePath)) {
			name = await getNewName();
		} else {
			const zIdNames = fs
				.readdirSync(basePath, { withFileTypes: true })
				.filter((dirent) => (!dirent.isDirectory() && dirent.name.endsWith('.json')))
				.map((dirent) => dirent.name.split('.json')[0]);

			if (zIdNames.length === 0) {
				name = await getNewName();
			} else {
				const choicePrompt = new (enquirer as any).Select({
					name: "Choose",
					message: "Existing node configuration found at ~/.zchain/zId",
					choices: ["Load from an existing node", "Initialize a new node"],
				});

				const selectedChoice = await choicePrompt.run();
				if (String(selectedChoice).startsWith('Initialize')) {
					name = await getNewName();
				} else {
					const namePrompt = new (enquirer as any).Select({
						name: "Nodes",
						message: "Pick a node to load",
						choices: zIdNames,
					});
					name = await namePrompt.run();
				}
			}
		}

    await startConsole(name);
  }
}
