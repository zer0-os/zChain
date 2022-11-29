import chalk from "chalk";
import fs from "fs";
import path from "path";
import {createSecp256k1PeerId} from "@libp2p/peer-id-factory";
import { peerIdFromString } from "@libp2p/peer-id";
import { createFromJSON } from '@libp2p/peer-id-factory';
import {PeerId} from "@libp2p/interface-peer-id";
import {toString as uint8ArrayToString} from "uint8arrays/to-string";
import { PEER_ID_PATH } from "./constants.js";
import { readFile, writeFile600Perm } from "./files.js";


export function assertValidPeerId(peerId: string) {
  try {
    peerIdFromString(peerId);
  } catch (error) {
    throw new Error(chalk.red(`Invalid zId: ${peerId}`))
  }
}


export type PeerIdJSON = {id: string; pubKey?: string; privKey?: string};

export function exportToJSON(peerId: PeerId): PeerIdJSON {
  return {
    id: uint8ArrayToString(peerId.toBytes(), "base58btc"),
    pubKey: peerId.publicKey != null ? uint8ArrayToString(peerId.publicKey, "base64pad") : undefined,
    privKey:
      peerId.privateKey == null
        ? undefined
        : uint8ArrayToString(peerId.privateKey, "base64pad"),
  };
}

/**
 * Creates a new peerid/load an exsiting peerID from a name.
 * If file does not exist, creates a new peerid and save it to the json.
 * @param name name of the node (assigned by end user using cli)
 */
export async function createPeerIdFromName (name: string): Promise<PeerId> {
  const peerIdPath = path.join(PEER_ID_PATH, `${name}.json`);
  if (fs.existsSync(peerIdPath)) {
    console.info(`Using existing peer id at ${peerIdPath}\n`);
    const content = readFile(peerIdPath);
    return await createFromJSON(JSON.parse(content));
  }

  console.info(`PeerId not found. Generating new peer id at ${peerIdPath}`);
  const peerId = await createSecp256k1PeerId();
  writeFile600Perm(peerIdPath, exportToJSON(peerId));
  return peerId;
}



