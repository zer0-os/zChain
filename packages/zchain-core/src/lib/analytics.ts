import axios from "axios";
import os from "os";
import { ZID } from "./zid";
import path from "path";
import { DB_PATH } from "./constants";
import { dirSize } from "./files";


/**
 * Class to analyze zchain data
 * + currently this means piping the data to a central server (and then data viz)
 */
export class Analytics {
  public status: Boolean; // if true/enabled, only then send the data

  async pipeDataToCentralServer(zId: ZID, message: string, channel: string, network?: string) {
    const peerId = zId.peerId.toB58String();

    if (!this.status || this.status === false) {
      return; 
    }

    // compute storage by this node, in this system on network
    const dbPath = path.join(DB_PATH, zId.name);
    const storage = await dirSize(dbPath);
    const storageInMB = storage * 0.1e6; // mb
    
    // ip address is determined in the req object of server 
    const data = {
      "message": message,
      "peerId": peerId,
      "version": "1.0.0",
      "network": network ?? "nil",
      "os": os.type(),
      "channel": channel,
      "storage": storageInMB
    }

    // heroku app on which simulator/master is deployed
    const serverUrl = 'zchain-master.herokuapp.com';
    //const serverUrl = 'localhost:3000';
    await axios.post(`http://${serverUrl}/zchain/analytics`, data)
    .then((res) => {
      // console.log(`Status: ${res.status}`);
      // console.log('Body: ', res.data);
    }).catch((err) => {
      console.error(err);
    });
  }
}

