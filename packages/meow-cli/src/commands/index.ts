import commands from './commands'
import daemon from './daemon'
import topic from './topic'
import sendmeow from './sendmeow';
import peer from './peer';
import open from './open';
// import init from './init';
import swarm from './swarm';
import db from './db';
import set from './set';

export const commandList = [
  //init,
  sendmeow,
  topic,
  peer,
  swarm,
  set,
  db,
  commands,
  daemon,
  open
]
