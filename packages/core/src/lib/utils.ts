import os from 'os'
import path from 'path'


export const getRepoPath = (): string => {
  return path.join(os.homedir(), '/.zchain');
}
