import commands from './commands.js'
import daemon from './daemon.js'
import topic from './topic.js'
import sendmeow from './sendmeow.js';
import peer from './peer.js';
import open from './open.js';
import init from './init.js';

export const commandList = [
  init,
  sendmeow,
  topic,
  peer,
  commands,
  daemon,
  open
]
