import type { Multiaddr } from 'multiaddr'
import { MEOW } from "meow-app";

// declare module '@hapi/hapi' {
//   interface ServerInfo {
//     ma: Multiaddr
//   }
// }

export interface Argv {
  ctx: Context
}

export interface Context {
  meow: MEOW
  print: Print
  isDaemon: boolean
  getStdin: () => AsyncIterable<Buffer>
  repoPath: string
}

export interface Print {
  (msg: string | Uint8Array, includeNewline?: boolean, isError?: boolean): void
  clearLine: () => void
  cursorTo: (pos: number) => void
  write: (data: any) => void
  error: (msg: string, includeNewline?: boolean) => void
  isTTY: boolean
  columns: any
}
