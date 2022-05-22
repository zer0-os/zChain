import os from 'os'
import path from 'path'

export const RELAY_ADDRS = [
  // custom relay servers (on aws ec2)
  '/dns4/vast-escarpment-62759.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/QmVa4AaHxHU9VrMXJ4bVsBM3FyKJHKpCeNZXJH6ojbzfiE',
  '/dns4/sheltered-mountain-08581.herokuapp.com/tcp/443/wss/p2p-webrtc-star/p2p/Qmbcqh29ANAFix37u6WLpuGq13SGWDBzDEuyEcMEbB91AQ',
];

export const password = "ratikjindal@3445";

export const ZCHAIN_DIR = '.zchain';

export const ZID_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'zId')
export const IPFS_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'ipfs')
export const DB_PATH = path.join(os.homedir(), ZCHAIN_DIR, 'db')
