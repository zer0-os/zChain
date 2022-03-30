import FeedStore from "orbit-db-feedstore";
import KeyValueStore from "orbit-db-kvstore";

export interface PubSubMessage {
  topicIDs: string[]
  from: string
  data: Buffer | Uint8Array
  seqno: Buffer | Uint8Array
  signature: Buffer | Uint8Array
  key: Buffer | Uint8Array
  receivedFrom: string
}

export interface ZChainMessage {
  prev: string,
  from: string,
  topic: string,
  message: string,
  timestamp: number,
  seqno?: Buffer | Uint8Array
  signature?: Buffer | Uint8Array
  key?: Buffer | Uint8Array
}

export interface LogPaths {
  default: string
  discovery: string | undefined
  feeds: string
  topics: string
}

export interface FeedMap {
  [key: string]: FeedStore<unknown>
}

export interface DBs {
  // default: hypercore | undefined // not sure if we need a "default" feed
  feeds: FeedMap
  //topics: FeedMap
  discovery: KeyValueStore<unknown>
}