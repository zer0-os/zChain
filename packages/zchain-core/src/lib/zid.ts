import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";
import PeerId from "peer-id";

import { getPathFromDirRecursive } from "./files";
import { ZID_PATH } from "./constants";

const PEER_ID_DIR = "ids";
const jsonExt = ".json";

export function assertValidzId(peerId: string) {
  try {
    PeerId.createFromB58String(peerId);
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
      this.peerId = await PeerId.createFromJSON(JSON.parse(content));
      return;
    }

    console.info(`PeerId not found. Generating new peer id at ${peerIdPath}`);
    this.peerId = await PeerId.create();
    this.writeFile(
      peerIdPath,
      JSON.stringify(this.peerId.toJSON(), null, 2)
    );
  }

  createFromB58String (peerIdStr: string): void {
    this.peerId = PeerId.createFromB58String(peerIdStr);
  }

  private readFile (path: string): string {
    return fs.readFileSync(path, 'utf-8');
  }

  private writeFile (filename: string, content: string): void {
    fs.writeFileSync(filename, content);
  }
}
