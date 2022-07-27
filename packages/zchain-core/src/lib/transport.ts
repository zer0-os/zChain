import { Libp2pOptions } from "libp2p";
import { WebRTCStar } from "@libp2p/webrtc-star";
import wrtc from "wrtc";

/**
 * handle webrtc-star transport in libp2p options obj
 */
export function addWebRTCStarAddrs (options: Libp2pOptions): void {
  if (options === undefined) { return; }

  // enable webrtc-star in node.transport
  // options.modules = {
  //   ...options.modules,
  //   transport: [
  //     ...options.modules.transport, WebRTCStar
  //   ]
  // };

  // // add transport key in config (only required in nodejs environment, not in browser)
  // const transportKey = WebRTCStar.prototype[Symbol.toStringTag];
  // options.config = {
  //   ...options.config,
  //   transport: {
  //     ...options.config?.transport,
  //     [transportKey]: { wrtc } // You can use `wrtc` when running in Node.js
  //   }
  // };
}
