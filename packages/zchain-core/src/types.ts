import hypercore from "hypercore";

export interface PubSubMessage {
  topicIDs: string[]
  from: string
  data: Buffer | Uint8Array
  seqno: Buffer | Uint8Array
  signature: Buffer | Uint8Array
  key: Buffer | Uint8Array
  receivedFrom: string
}

export interface LogPaths {
  default: string
  discovery: string | undefined
}

export interface LogFeeds {
  default: hypercore | undefined // not sure if we need a "default" feed
  discovery: hypercore | undefined
}
