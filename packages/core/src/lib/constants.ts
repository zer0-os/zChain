import os from 'os'
import path from 'path'


export const ROOT_DIR = '.ringer';

export const PEER_ID_PATH = path.join(os.homedir(), ROOT_DIR, 'peerId')
//export const DB_PATH = path.join(os.homedir(), ROOT_DIR, 'db')

