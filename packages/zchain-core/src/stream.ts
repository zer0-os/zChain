'use strict'

import { pipe } from 'it-pipe';
// import { encode, decode } from 'it-length-prefixed';

export function stdinToStream(stream: any) {
  // Read utf-8 from stdin
  process.stdin.setEncoding('utf8')
//   pipe(
//     // Read from stdin (the source)
        // process.stdin
//     // Encode with length prefix (so receiving side knows how much data is coming)
//     stream.encode(),
//     // Write to the stream (the sink)
//     stream.sink
//   )
}

export function streamToConsole(stream: any) {
//   pipe(
//     // Read from the stream (the source)
//     stream.source,
//     // Decode length-prefixed data
//     lp.decode(),
//     // Sink function
//     async function (source: any) {
//       // For each chunk of data
//       for await (const msg of source) {
//         // Output the data as a utf8 string
//         console.log('> ' + msg.toString().replace('\n', ''))
//       }
//     }
//   )
}