/* eslint-disable no-console */

import * as lp from 'it-length-prefixed';
import { pipe } from 'it-pipe';

export function stdinToStream (stream: any): void {
  // Read utf-8 from stdin
  process.stdin.setEncoding('utf8');
  pipe(
    // Read from stdin (the source)
    process.stdin,
    // Encode with length prefix (so receiving side knows how much data is coming)
    lp.encode(),
    // Write to the stream (the sink)
    stream.sink
  )
}

export function streamToConsole (stream: any): void {
  pipe(
    // Read from the stream (the source)
    stream.source,
    // Decode length-prefixed data
    lp.decode(),
    // Sink function
    async function (source: any) {
      // For each chunk of data
      for await (const msg of source) {
        // Output the data as a utf8 string
        console.log('> ' + String(msg).toString().replace('\n', ''));
      }
    }
  )
    .catch(err => { throw new Error(err); });
}
