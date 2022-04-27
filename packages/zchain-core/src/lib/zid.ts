import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";
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

  async createNew (): Promise<void> {
    this.peerId = await PeerId.create();
    const peerIDPath = path.join(os.homedir(), '/.jsipfs', this.peerId.toB58String(), 'peer.json');
    console.info(`Generating new peer id at ${peerIDPath}`);

    // save to file
    fs.mkdirSync(path.join(os.homedir(), '/.jsipfs', this.peerId.toB58String()), { recursive: true });
    this.writeFile(
      path.join(os.homedir(), '/.jsipfs', this.peerId.toB58String(), 'peer.json'),
      JSON.stringify(this.peerId.toJSON(), null, 2)
    );
  }

  /**
   * Creates a new peerid. Loads existing peerID from ids/*.json.
   * If file does not exist, creates a new peerid and save it to the json.
   * @param fileNameOrPath name of .json file containing peer id
   */
  async create (fileNameOrPath: string | undefined): Promise<void> {
    if (fileNameOrPath === undefined) {
      await this.createNew();
      return;
    }

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
      if (!fs.existsSync(filePath)) {
        console.info(`Generating new peer id at ${filePath}`);

        this.peerId = await PeerId.create();
        this.writeFile(
          filePath,
          JSON.stringify(this.peerId.toJSON(), null, 2)
        );
      }
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
