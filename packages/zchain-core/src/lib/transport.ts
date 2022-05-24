import { Libp2pOptions } from "libp2p";
import { WebRTCStar } from "@libp2p/webrtc-star";
import wrtc from "wrtc";

/**
 * handle webrtc-star transport in libp2p options obj
 */
export function addWebRTCStarAddrs (options: Libp2pOptions): void {
  if (options === undefined) { return; }

  // enable webrtc-star in node.transport
  options = {
    ...options,
    transports: [
      ...options.transports,
      //new WebRTCStar({ wrtc: wrtc })
    ]
  };
}
