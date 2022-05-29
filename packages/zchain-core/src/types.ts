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
  feeds: string
  topics: string
  addressBook: string
  metaData: string
}

export interface FeedMap {
  [key: string]: FeedStore<unknown>
}

export interface PeerMeta {
  defaultAddress: string
  meta: Meta[]
}

export interface Meta {
  ethAddress: string
  signature: string
}

export interface DBs {
  // default: hypercore | undefined // not sure if we need a "default" feed
  feeds: FeedMap
  //topics: FeedMap
  addressBook: KeyValueStore<unknown>
  metaData: KeyValueStore<unknown>
}