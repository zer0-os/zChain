import fs from 'fs'
import os from 'os'
import path from 'path'
import debug from 'debug'
import { Multiaddr } from 'multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const log = debug('ringer:cli:utils')

export const getRepoPath = () => {
  return path.join(os.homedir(), '/.ringer')
}

export const isDaemonOn = () => {
  try {
    fs.readFileSync(path.join(getRepoPath(), 'api'))
    log('daemon is on')
    return true
  } catch (/** @type {any} */ err) {
    log('daemon is off')
    return false
  }
}

let visible = true
export const disablePrinting = () => { visible = false }

/**
 * @type {import('./types').Print}
 */
export const print = (msg, includeNewline = true, isError = false) => {
  if (visible) {
    if (msg === undefined) {
      msg = ''
    }
    msg = msg.toString()
    msg = includeNewline ? msg + '\n' : msg
    const outStream = isError ? process.stderr : process.stdout

    outStream.write(msg)
  }
}

print.clearLine = () => {
  return process.stdout.clearLine(0)
}

/**
 * @param {number} pos
 */
print.cursorTo = (pos) => {
  process.stdout.cursorTo(pos)
}

/**
 * Write data directly to stdout
 *
 * @param {string|Uint8Array} data
 */
print.write = (data) => {
  process.stdout.write(data)
}

/**
 * Print an error message
 *
 * @param {string} msg
 * @param {boolean} [newline=true]
 */
print.error = (msg, newline = true) => {
  print(msg, newline, true)
}

// used by ipfs.add to interrupt the progress bar
print.isTTY = process.stdout.isTTY
print.columns = process.stdout.columns



/**
 * @param {*} val
 * @param {number} n
 */
export const rightpad = (val, n) => {
  let result = String(val)
  for (let i = result.length; i < n; ++i) {
    result += ' '
  }
  return result
}

export const pathHelp = 'This cli uses a repository in the local file system. By default, the repo is ' +
  'located at ~/.ringer\n'



/**
 * @param {boolean} [value]
 */
export const asBoolean = (value) => {
  if (value === false || value === true) {
    return value
  }

  if (value === undefined) {
    return true
  }

  return false
}

/**
 * @param {any} value
 */
export const asOctal = (value) => {
  return parseInt(value, 8)
}


/**
 * @param {string} value
 */
export const coerceMultiaddr = (value) => {
  if (value == null) {
    return undefined
  }

  return new Multiaddr(value)
}

/**
 * @param {string[]} values
 */
export const coerceMultiaddrs = (values) => {
  if (values == null) {
    return undefined
  }

  return values.map(coerceMultiaddr).filter(Boolean)
}

/**
 * @param {string} value
 */
export const coerceUint8Array = (value) => {
  if (value == null) {
    return undefined
  }

  return uint8ArrayFromString(value)
}

const DEL = 127

/**
 * Strip control characters from a string
 *
 * @param {string} [str] - a string to strip control characters from
 */
export const stripControlCharacters = (str) => {
  return (str || '')
    .split('')
    .filter((c) => {
      const charCode = c.charCodeAt(0)

      return charCode > 31 && charCode !== DEL
    })
    .join('')
}

/**
 * Escape control characters in a string
 *
 * @param {string} str - a string to escape control characters in
 */
export const escapeControlCharacters = (str) => {
  /** @type {Record<string, string>} */
  const escapes = {
    '00': '\\0',
    '08': '\\b',
    '09': '\\t',
    '0A': '\\n',
    '0B': '\\v',
    '0C': '\\f',
    '0D': '\\r'
  }

  return (str || '')
    .split('')
    .map((c) => {
      const charCode = c.charCodeAt(0)

      if (charCode > 31 && charCode !== DEL) {
        return c
      }

      const hex = Number(c).toString(16).padStart(2, '0')

      return escapes[hex] || `\\x${hex}`
    })
    .join('')
}


