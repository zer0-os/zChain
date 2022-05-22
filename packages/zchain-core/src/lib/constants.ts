import os from 'os'
import path from 'path'

export const RELAY_ADDRS = [
  // custom relay servers (on aws ec2)
  '/ip4/35.166.99.232/tcp/15003/ws/p2p/QmVa4AaHxHU9VrMXJ4bVsBM3FyKJHKpCeNZXJH6ojbzfiE',
  '/ip4/35.166.99.232/tcp/15002/ws/p2p/Qmbcqh29ANAFix37u6WLpuGq13SGWDBzDEuyEcMEbB91AQ',
];

export const password = "ratikjindal@3445";

export const ZCHAIN_DIR = '.zchain';

export const ZID_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'zId')
export const IPFS_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'ipfs')
export const DB_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'db')
