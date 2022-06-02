import { types as ztypes } from "zchain-core";
import KeyValueStore from "orbit-db-kvstore";

export interface MeowDBs {
  channels: ztypes.FeedMap
  followingZIds: KeyValueStore<unknown>
  followingChannels: KeyValueStore<unknown>
  networks: KeyValueStore<unknown>
}

export interface TwitterConfig {
  appKey: string,
  appSecret: string,
  accessToken: string,
  accessSecret: string
}

export interface Network {
  address: string,
  signature: string,
  channels: string[]
}