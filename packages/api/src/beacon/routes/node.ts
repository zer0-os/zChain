import {allForks, ssz, StringType} from "@lodestar/types";
import {ContainerType} from "@chainsafe/ssz";
import {
  ArrayOf,
  ContainerData,
  reqEmpty,
  jsonType,
  ReturnTypes,
  RoutesData,
  Schema,
  ReqSerializers,
  ReqEmpty,
  sameType,
} from "../../utils/index.js";

// See /packages/api/src/routes/index.ts for reasoning and instructions to add new routes

export type NetworkIdentity = {
  /** Cryptographic hash of a peer’s public key. [Read more](https://docs.libp2p.io/concepts/peer-id/) */
  peerId: string;
  /** Ethereum node record. [Read more](https://eips.ethereum.org/EIPS/eip-778) */
  enr: string;
  p2pAddresses: string[];
  discoveryAddresses: string[];
  /** Based on Ethereum Consensus [Metadata object](https://github.com/ethereum/consensus-specs/blob/v1.1.10/specs/phase0/p2p-interface.md#metadata) */
  metadata: allForks.Metadata;
};

export type PeerState = "disconnected" | "connecting" | "connected" | "disconnecting";
export type PeerDirection = "inbound" | "outbound";

export type NodePeer = {
  peerId: string;
  enr: string;
  lastSeenP2pAddress: string;
  state: PeerState;
  // the spec does not specify direction for a disconnected peer, lodestar uses null in that case
  direction: PeerDirection | null;
};

export type PeerCount = {
  disconnected: number;
  connecting: number;
  connected: number;
  disconnecting: number;
};

export type FilterGetPeers = {
  state?: PeerState[];
  direction?: PeerDirection[];
};

export type SyncingStatus = {
  /** Head slot node is trying to reach */
  headSlot: string;
  /** How many slots node needs to process to reach head. 0 if synced. */
  syncDistance: string;
  /** Set to true if the node is syncing, false if the node is synced. */
  isSyncing: boolean;
  /** Set to true if the node is optimistically tracking head. */
  isOptimistic: boolean;
};

export enum NodeHealth {
  READY = 200,
  SYNCING = 206,
  NOT_INITIALIZED_OR_ISSUES = 503,
}

/**
 * Read information about the beacon node.
 */
export type Api = {
  /**
   * Get node network peers
   * Retrieves data about the node's network peers. By default this returns all peers. Multiple query params are combined using AND conditions
   * @param state
   * @param direction
   */
  getPeers(filters?: FilterGetPeers): Promise<{data: NodePeer[]; meta: {count: number}}>;
};

export const routesData: RoutesData<Api> = {
  getPeers: {url: "/eth/v1/node/peers", method: "GET"},
};

/* eslint-disable @typescript-eslint/naming-convention */

export type ReqTypes = {
  getNetworkIdentity: ReqEmpty;
  getPeers: {query: {state?: PeerState[]; direction?: PeerDirection[]}};
  getPeer: {params: {peer_id: string}};
  getPeerCount: ReqEmpty;
  getNodeVersion: ReqEmpty;
  getSyncingStatus: ReqEmpty;
  getHealth: ReqEmpty;
};

export function getReqSerializers(): ReqSerializers<Api, ReqTypes> {
  return {

    getPeers: {
      writeReq: (filters) => ({query: filters || {}}),
      parseReq: ({query}) => [query],
      schema: {query: {state: Schema.StringArray, direction: Schema.StringArray}},
    },
  };
}

export function getReturnTypes(): ReturnTypes<Api> {
  const stringType = new StringType();
  const NetworkIdentity = new ContainerType(
    {
      peerId: stringType,
      enr: stringType,
      p2pAddresses: ArrayOf(stringType),
      discoveryAddresses: ArrayOf(stringType),
      metadata: ssz.altair.Metadata,
    },
    {jsonCase: "eth2"}
  );

  const PeerCount = new ContainerType(
    {
      disconnected: ssz.UintNum64,
      connecting: ssz.UintNum64,
      connected: ssz.UintNum64,
      disconnecting: ssz.UintNum64,
    },
    {jsonCase: "eth2"}
  );

  return {
    //
    // TODO: Consider just converting the JSON case without custom types
    //
    getPeers: jsonType("snake"),
  };
}
