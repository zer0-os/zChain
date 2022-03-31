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
   * Creates a new peerid. Loads existing peerID from ids/*.json.
   * If file does not exist, creates a new peerid and save it to the json.
   * @param fileName name of .json file containing peer id
   */
  async create (fileNameOrPath: string): Promise<void> {
    let fileName = path.basename(fileNameOrPath);
    if (path.extname(fileName) !== jsonExt) {
      throw new Error(`File ${fileName} is not a json`);
    }

    let filePath: string;
    if (fileNameOrPath === fileName) {
      // get path from /ids if not passed "explicitely"
      filePath = getPathFromDirRecursive(PEER_ID_DIR, fileName);
    } else {
      filePath = fileNameOrPath;
    }

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
