import { pathHelp } from '../utils.js'
import repl from "repl";
import chalk from "chalk";
import { runInNewContext } from "vm";
import os from 'os';
import fs from 'fs';
import path from 'path';
import delay from 'delay';
import enquirer from "enquirer";
// loookkkk
import { P2PNode } from 'core';
import yargs from 'yargs';

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

interface NodeInitOpts {
  name: string,
  rest: {
    port: number
    address: string
  }
}

async function startNode(opts: NodeInitOpts): Promise<void> {
  const node = new P2PNode();
  await node.initialize(opts);
}

async function getNewName() {		
	const response = await enquirer.prompt({
		type: 'input',
		name: 'peerName',
		message: 'Please type a name for your node'
	});

	return (response as any).zIdName;
}

export default {
  command: 'init',

  describe: 'Initializes a p2p node to facilitate chatting b/w validators',

  /**
   * @param yargs
   */
  builder (yargs) {
    return yargs
      .epilog(pathHelp)
      .option('force', {
        type: 'boolean',
        desc: 'If true, REMOVES any previos config present at ~/.ringer',
        default: false
      })
      .option('name', {
        type: 'string',
        desc: 'Name of the node. If passed, this name is directly used to initialize the node',
      })
      // rest api options
      .option('restPort', {
        type: 'number',
        desc: 'Listen TCP port for the HTTP REST server',
				default: '9596'
      })
      .option('restAddr', {
        type: 'string',
        desc: 'Listen address for the HTTP REST server',
				default: '127.0.0.1'
      })
  },

  /**
   * @param {object} argv
   * @param {import('../types').Context} argv.ctx
   */
  async handler (argv) {
    // remove existing config if --force is passed
    if (argv.force) {
      fs.rmSync(path.join(os.homedir(), '/.ringer'), {force: true, recursive: true});
    }

		let name: string;
		if (argv.name !== undefined) {
			name = argv.name;
		} else {
			const basePath = path.join(os.homedir(), '.ringer', 'peerId');
			if (!fs.existsSync(basePath)) {
				name = await getNewName();
			} else {
				const names = fs
					.readdirSync(basePath, { withFileTypes: true })
					.filter((dirent) => (!dirent.isDirectory() && dirent.name.endsWith('.json')))
					.map((dirent) => dirent.name.split('.json')[0]);

				if (names.length === 0) {
					name = await getNewName();
				} else {
					const choicePrompt = new (enquirer as any).Select({
						name: "Choose",
						message: "Existing node configuration found at ~/.ringer/peerId",
						choices: ["Load from an existing node", "Initialize a new node"],
					});

					const selectedChoice = await choicePrompt.run();
					if (String(selectedChoice).startsWith('Initialize')) {
						name = await getNewName();
					} else {
						const namePrompt = new (enquirer as any).Select({
							name: "Nodes",
							message: "Pick a node to load",
							choices: names,
						});
						name = await namePrompt.run();
					}
				}
			}
		}

    await startNode({ 
			name: argv.name, 
			rest: { port: argv.restPort, address: argv.restAddr } 
		});
  }
}
