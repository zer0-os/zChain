import {routes} from "api";
//import {createKeypairFromPeerId} from "@chainsafe/discv5";
import {ApiError} from "../errors.js";
import {ApiModules} from "../types.js";
import {IApiOptions} from "../../options.js";
import {formatNodePeer, getRevelantConnection} from "./utils.js";

export function getNodeApi(opts: IApiOptions, {node}: Pick<ApiModules, "node">): routes.node.Api {
  return {

    async getPeers(filters) {
      console.log("I AM FINALLY HEREEEE")
      console.log("->>> ", node.getMultiaddrs())
      // const {state, direction} = filters || {};
      // const peers = Array.from(network.getConnectionsByPeer().entries())
      //   .map(([peerIdStr, connections]) => formatNodePeer(peerIdStr, connections))
      //   .filter(
      //     (nodePeer) =>
      //       (!state || state.length === 0 || state.includes(nodePeer.state)) &&
      //       (!direction || direction.length === 0 || (nodePeer.direction && direction.includes(nodePeer.direction)))
      //   );

      return {
        data: [],
        meta: {count: 3},
      };
    },

  };
}
