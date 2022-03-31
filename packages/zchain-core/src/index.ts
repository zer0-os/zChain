// helper functions
import { stdinToStream, streamToConsole } from "./lib/stream";
import { ZCHAIN } from "./lib/zchain";
import { ZStore } from "./lib/storage";
import { decode, encode } from "./lib/encryption";
import { assertValidzId, ZID } from "./lib/zid";
import { isDaemonOn, getIpfs } from "./lib/utils";
import * as types from "./types";

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
  getIpfs
};
