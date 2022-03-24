import chalk from "chalk";
import fs from "fs";
import path from "path";
import PeerId from "peer-id";

import { getPathFromDirRecursive } from "./files";

const PEER_ID_DIR = "ids";
const jsonExt = ".json";

export function assertValidzId(peerId: string) {
  try {
    PeerId.createFromB58String(peerId);
  } catch (error) {
    console.error(chalk.red(`Invalid zId: ${peerId}`));
  }
}

/**
 * Class representing zchain id (a persistent peer id accross zchain nodes)
 */
export class ZID {
  public name: string | undefined; // maybe we can use a name associated with peer id?
  public peerId: PeerId | undefined;

  /**
   * Creates a new peerid. Loads existing peerID from ids/*.json.
   * If file does not exist, creates a new peerid and save it to the json.
   * @param fileName name of .json file containing peer id
   */
  async create (fileName: string): Promise<void> {
    if (!fileName.endsWith(jsonExt)) {
      throw new Error(`File ${fileName} is not a json`);
    }

    const filePath = getPathFromDirRecursive(PEER_ID_DIR, fileName);
    if (filePath !== undefined) {
      const content = this.readFile(filePath);
      this.peerId = await PeerId.createFromJSON(JSON.parse(content));
    } else {
      console.info(`Json ${fileName} not found. Generating new peer id`);

      this.peerId = await PeerId.create();
      this.writeFile(
        path.join(PEER_ID_DIR, fileName),
        JSON.stringify(this.peerId.toJSON(), null, 2)
      );
    }
  }

  private readFile (path: string): string {
    return fs.readFileSync(path, 'utf-8');
  }

  private writeFile (filename: string, content: string): void {
    fs.writeFileSync(filename, content);
  }
}
