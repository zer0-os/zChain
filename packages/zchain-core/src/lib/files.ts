import * as fsWalk from '@nodelib/fs.walk';
import path from "path";

/**
 * Reads the directory recursively and returns all paths
 * @param directoryName name of directory
 */
export function lsTreeWalk (directoryName: string): string[] {
  return fsWalk.walkSync(directoryName).map(f => f.path);
};

/**
 * Searches recursively and returns path of file in a given directory. Throws error
 * if multiple files with same name are found (in directory or sub-directory)
 * @param dir directory name
 * @param fileName name of file to search in directory
 */
export function getPathFromDirRecursive (
  dir: string,
  fileName: string
): string | undefined {
  const paths = lsTreeWalk(dir);

  let filePath: string;
  for (const p of paths) {
    const fileNameFromPath = path.basename(p);
    if (fileNameFromPath === fileName) {
      if (filePath) { // if file already found previously, throw error
        throw new Error(`Directory ${dir} has same file "${fileName}" in multiple paths: ${filePath}, ${p}`);
      } else {
        filePath = p;
      }
    }
  }

  return filePath;
}
