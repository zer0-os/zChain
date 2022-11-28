import {IChainForkConfig} from "@lodestar/config";
import {ILogger} from "@lodestar/utils";
import { Libp2p as ILibp2p } from "libp2p";



/**
 * PR ensure API follows spec required to include the isOptimistic boolean in many routes.
 * To keep the scope of the PR manageable, the PR will only add the flag with proper logic on
 * critical routes. Else it is left as a temporary always false to be implemented next.
 */
export const IS_OPTIMISTIC_TEMP = false;

export type ApiModules = {
  //logger: ILogger;
  node: ILibp2p
};
