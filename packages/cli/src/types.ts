
export interface Argv {
  ctx: Context
}

export interface Context {
  meow: any
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
