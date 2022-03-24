import { types as ztypes } from "zchain-core";
import KeyValueStore from "orbit-db-kvstore";

export interface MeowDBs {
  // default: hypercore | undefined // not sure if we need a "default" feed
  topics: ztypes.FeedMap
  followingZIds: KeyValueStore<unknown>
  followingTopics: KeyValueStore<unknown>
}