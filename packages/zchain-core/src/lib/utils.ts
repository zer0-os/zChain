import fs from 'fs'
import os from 'os'
import path from 'path'
import { create as httpClient, IPFSHTTPClient } from 'ipfs-http-client'


export const getRepoPath = (): string => {
  return path.join(os.homedir(), '/.jsipfs');
  //return process.env.IPFS_PATH || path.join(os.homedir(), '/.jsipfs')
}

export const isDaemonOn = (): boolean => {
  try {
    fs.readFileSync(path.join(getRepoPath(), 'api'))
    return true
  } catch (/** @type {any} */ err) {
    return false
  }
}

/**
 * @param {{ api?: string, silent?: boolean, migrate?: boolean, pass?: string }} argv
 */
export async function getIpfs (api?: string): Promise<IPFSHTTPClient> {
  let endpoint = null
  if (!api) {
    const apiPath = path.join(getRepoPath(), 'api')
    endpoint = fs.readFileSync(apiPath).toString()
  } else {
    endpoint = api
  }

  /** @type {import('ipfs-core-types').IPFS} */
  const ipfs = httpClient({ url: endpoint })
  return ipfs;
}