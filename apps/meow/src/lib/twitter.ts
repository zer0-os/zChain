import { ZCHAIN } from "zchain-core";
import { MStore } from "./storage";
import  { TwitterApi } from "twitter-api-v2";
import fs from "fs";
import path from 'path';
import os from 'os';

/**
 * Class for handling twitter operations
 */
export class Twitter {
  zChain: ZCHAIN;
  store: MStore;
  client: TwitterApi;

  /**
   * Initializes TwitterApi client
   */
  constructor (zChain: ZCHAIN, store: MStore) {
    this.zChain = zChain;
    this.store = store;

    const twitterConfig = fs.readFileSync(
      path.join(os.homedir(), '/.jsipfs', 'twitter-config.json'), "utf8"
    );
    this.client = new TwitterApi(JSON.parse(twitterConfig));
  }

  async peerID() { return await this.zChain.ipfs.id(); }


  async tweet(msg: string): Promise<void> {
    const { data: createdTweet } = await this.client.v2.tweet(msg);
    console.log('Tweeted', createdTweet);
  }
}

