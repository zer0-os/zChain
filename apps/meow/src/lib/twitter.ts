import { ZCHAIN } from "zchain-core";
import { MStore } from "./storage.js";
import  { TwitterApi } from "twitter-api-v2";
import { TwitterConfig } from "../types.js";
import chalk from 'chalk';

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
  constructor (zChain: ZCHAIN, store: MStore, config: TwitterConfig) {
    this.zChain = zChain;
    this.store = store;
    this.client = new TwitterApi(config);
  }

  async tweet(msg: string): Promise<void> {
    console.log("\nTweeting..");
    const { data: createdTweet } = await this.client.v2.tweet(msg);
    console.log(chalk.green('Tweeted! '), createdTweet);
  }
}

