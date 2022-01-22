'use strict'

const Pair = require('it-pair')
const Wrap = require('..')
const assert = require('assert').strict
const { int32BEDecode, int32BEEncode } = require('it-length-prefixed')
const { BufferList } = require('bl')
const { concat: uint8ArrayConcat } = require('uint8arrays/concat')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { Buffer } = require('buffer')

/* eslint-env mocha */
/* eslint-disable require-await */

const assertBytesEqual = (a, b) => {
  a = a instanceof Uint8Array ? a : a.slice()
  b = b instanceof Uint8Array ? b : b.slice()

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      throw new Error(`Byte at index ${i} incorrect, expected ${a[i]}, got ${b[i]}`)
    }
  }
}

const tests = {
  Buffer: {
    from: (str) => Buffer.from(str),
    alloc: (length, fill = 0) => Buffer.alloc(length, fill),
    allocUnsafe: (length) => Buffer.allocUnsafe(length),
    concat: (arrs, length) => Buffer.concat(arrs, length),
    writeInt32BE: (buf, value, offset) => buf.writeInt32BE(value, offset)
  },
  Uint8Array: {
    from: (str) => uint8ArrayFromString(str),
    alloc: (length, fill = 0) => new Uint8Array(length).fill(fill),
    allocUnsafe: (length) => new Uint8Array(length),
    concat: (arrs, length) => uint8ArrayConcat(arrs, length),
    writeInt32BE: (buf, value, offset) => new DataView(buf.buffer, buf.byteOffset, buf.byteLength).setInt32(offset, value, false)
  },
  BufferList: {
    from: (str) => new BufferList(str),
    alloc: (length, fill = 0) => new BufferList(Buffer.alloc(length, fill)),
    allocUnsafe: (length) => new BufferList(Buffer.allocUnsafe(length)),
    concat: (arrs, length) => new BufferList(Buffer.concat(arrs.map(arr => arr.slice()), length)),
    writeInt32BE: (buf, value, offset) => buf.slice().writeInt32BE(value, offset)
  }
}

Object.keys(tests).forEach(key => {
  const test = tests[key]

  describe(`it-pb-rpc ${key}` , () => {
    let pair
    let w

    before(async () => {
      pair = Pair()
      w = Wrap(pair)
    })

    describe('length-prefixed', () => {
      it('lp varint', async () => {
        const data = test.from('hellllllllloooo')

        w.writeLP(data)
        const res = await w.readLP()
        assertBytesEqual(data, res)
      })

      it('lp fixed encode', async () => {
        const duplex = Pair()
        const wrap = Wrap(duplex, { lengthEncoder: int32BEEncode })
        const data = test.from('hellllllllloooo')

        wrap.writeLP(data)
        const res = await wrap.read()
        const length = test.allocUnsafe(4)
        test.writeInt32BE(length, data.length, 0)
        const expected = test.concat([length, data])
        assertBytesEqual(res, expected)
      })

      it('lp fixed decode', async () => {
        const duplex = Pair()
        const wrap = Wrap(duplex, { lengthDecoder: int32BEDecode })
        const data = test.from('hellllllllloooo')
        const length = test.allocUnsafe(4)
        test.writeInt32BE(length, data.length, 0)
        const encoded = test.concat([length, data])

        wrap.write(encoded)
        const res = await wrap.readLP()
        assertBytesEqual(res, data)
      })

      it('lp exceeds max length decode', async () => {
        const duplex = Pair()
        const wrap = Wrap(duplex, { lengthDecoder: int32BEDecode, maxDataLength: 32 })
        const data = test.alloc(33, 1);
        const length = test.allocUnsafe(4)
        test.writeInt32BE(length, data.length, 0)
        const encoded = test.concat([length, data])

        wrap.write(encoded)
        try {
          await wrap.readLP()
          assert.fail("Should not be able to read too long msg data")
        } catch (e) {
          assert.ok(true);
        }
      })

      it('lp max length decode', async () => {
        const duplex = Pair()
        const wrap = Wrap(duplex, { lengthDecoder: int32BEDecode, maxDataLength: 5000 })
        const data = test.allocUnsafe(4000);
        const length = test.allocUnsafe(4)
        test.writeInt32BE(length, data.length, 0)
        const encoded = test.concat([length, data])

        wrap.write(encoded)
        const res = await wrap.readLP()
        assertBytesEqual(res, data)
      })

    })

    describe('plain data', async () => {
      it('whole', async () => {
        const data = Buffer.from('ww')

        w.write(data)
        const res = await w.read(2)

        assertBytesEqual(res, data)
      })

      it('split', async () => {
        const data = Buffer.from('ww')

        const r = Buffer.from('w')

        w.write(data)
        const r1 = await w.read(1)
        const r2 = await w.read(1)

        assertBytesEqual(r, r1)
        assertBytesEqual(r, r2)
      })
    })
  })

})