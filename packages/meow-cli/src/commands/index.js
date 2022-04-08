import commands from './commands.js'
import daemon from './daemon.js'
import topic from './topic.js'
import sendmeow from './sendmeow.js';
import peer from './peer.js';
import open from './open.js';
// import init from './init.js';
import swarm from './swarm.js';
import db from './db.js';

export const commandList = [
  //init,
  sendmeow,
  topic,
  peer,
  swarm,
  db,
  commands,
  daemon,
  open
]
