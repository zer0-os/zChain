import chalk from "chalk";
import fs from "fs";
import path from "path";
import { peerIdFromString, } from "@libp2p/peer-id";
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createFromJSON, createEd25519PeerId } from '@libp2p/peer-id-factory';
import { ZID_PATH } from "./constants.js";

export function assertValidzId(peerId: string) {
  try {
    peerIdFromString(peerId);
  } catch (error) {
    throw new Error(chalk.red(`Invalid zId: ${peerId}`))
    //console.error(chalk.red(`Invalid zId: ${peerId}`));
  }
}

/**
 * Class representing zchain id (a persistent peer id accross zchain nodes)
 */
export class ZID {
  public name: string | undefined; // maybe we can use a name associated with peer id?
  public peerId: PeerId | undefined;

  /**
   * Creates a new peerid/load an exsiting peerID from a name.
   * If file does not exist, creates a new peerid and save it to the json.
   * @param name name of a zchain node (assigned by user)
   */
  async createFromName (name: string): Promise<void> {
    const peerIdPath = path.join(ZID_PATH, `${name}.json`);
    this.name = name;
    if (fs.existsSync(peerIdPath)) {
      console.info(`Using existing peer id at ${peerIdPath}\n`);
      const content = this.readFile(peerIdPath);
      this.peerId = await createFromJSON(JSON.parse(content));
      return;
    }

    console.info(`PeerId not found. Generating new peer id at ${peerIdPath}`);
    this.peerId = await createEd25519PeerId();

    // this.writeFile(
    //   peerIdPath,
    //   JSON.stringify(this.peerId.toJSON(), null, 2)
    // );
  }

  private readFile (path: string): string {
    return fs.readFileSync(path, 'utf-8');
  }

  private writeFile (filename: string, content: string): void {
    fs.writeFileSync(filename, content);
  }
}
