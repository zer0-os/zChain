import FeedStore from "orbit-db-feedstore";
import KeyValueStore from "orbit-db-kvstore";
import * as Y from 'yjs';

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

export interface YDocMap {
  [key: string]: {
    doc: Y.Doc,
    feedArray: Y.Array<unknown>
  }
}

export interface PeerMeta {
  defaultAddress: string
  meta: Meta[]
}

export interface Meta {
  ethAddress: string
  signature: string
}

// private YDocs
export interface YDocs {
  feeds: YDocMap
}

// public YDocs
export interface PublicYDoc {
  doc: Y.Doc // root y.doc
  addressBook: Y.Map<unknown>
  metaData: Y.Map<unknown>
}

export interface DBs {
  feeds: FeedMap
  addressBook: KeyValueStore<unknown>
  metaData: KeyValueStore<unknown>
}