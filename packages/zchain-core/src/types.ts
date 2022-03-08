import hypercore from "hypercore";
import Hyperbee from "hyperbee";

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
  feeds: string
  topics: string
}

export interface CoreMap {
  [key: string]: hypercore
}

export interface Cores {
  default: hypercore | undefined // not sure if we need a "default" feed
  feeds: CoreMap
  topics: CoreMap
}

// for discovery we'll use a hyperbee (append only b-tree built on top of hypercore)
export interface HyperBeeDBs {
  discovery: Hyperbee
}