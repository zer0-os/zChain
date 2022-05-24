import { stdinToStream, streamToConsole } from "./lib/stream.js";
import { ZCHAIN } from "./lib/zchain.js";
import { ZStore } from "./lib/storage.js";
import { decode, encode } from "./lib/encryption.js";
import { RELAY_ADDRS } from "./lib/constants.js";
import { assertValidzId, ZID } from "./lib/zid.js";
import { isDaemonOn, getIpfs } from "./lib/utils.js";
import * as types from "./types.js";

export {
  ZCHAIN,
  stdinToStream,
  streamToConsole,
  ZStore,
  ZID,
  assertValidzId,
  types,
  decode,
  encode,
  isDaemonOn,
  getIpfs,
  RELAY_ADDRS
};
