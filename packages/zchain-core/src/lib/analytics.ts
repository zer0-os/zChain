import axios from "axios";
import os from "os";
import {version} from '../../package.json';

/**
 * Class to analyze zchain data
 * + currently this means piping the data to a central server (and then data viz)
 */
export class Analytics {
  public status: Boolean; // if true/enabled, only then send the data

  async pipeDataToCentralServer(peerId: string, message: string, channel: string, network?: string) {
    if (!this.status || this.status === false) {
      return; 
    }

    console.log("Here????")
    // ip address is determined in  
    const data = {
      "message": message,
      "peerId": peerId,
      "version": version,
      "network": network ?? "nil",
      "os": os.type(),
      "channel": channel
    };

    await axios.post('https://localhost:3000/zchain/analytics', data)
    .then((res) => {
      console.log(`Status: ${res.status}`);
      console.log('Body: ', res.data);
    }).catch((err) => {
      console.error(err);
    });
  }
}

