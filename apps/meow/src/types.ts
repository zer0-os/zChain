import { types as ztypes } from "zchain-core";
import KeyValueStore from "orbit-db-kvstore";

export interface MeowDBs {
  // default: hypercore | undefined // not sure if we need a "default" feed
  channels: ztypes.FeedMap
  followingZIds: KeyValueStore<unknown>
  followingChannels: KeyValueStore<unknown>
}