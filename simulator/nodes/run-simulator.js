import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from 'os'


function getTerminal() {
  if (os.platform() === 'darwin') {
    return [ 'osascript', '-e' ]
  }

  if (os.platform() === 'linux') {
    return [ 'gnome-terminal', '--' ]
  }

  return [];
}

async function runNode(keyPairFileName, ipAddress) {
  const t = getTerminal();
  if (t.length === 0) { throw new Error("Platform is neither linux or macOS"); }

  const childProcess = spawn('sh', [
    './scripts/0-ec2-ssh.sh', keyPairFileName, ipAddress
  ], {
    //stdio: "inherit",
    cwd: process.cwd(),
  });


  let result = "";
  await new Promise((resolve, reject) => {
    childProcess.once("close", (status) => {
      childProcess.removeAllListeners("error");

      if (status === 0) {
        resolve(true);
        return;
      }

      console.log("S ", status);
      reject(new Error("script process returned non 0 status"));
    });

    childProcess.stdout.on("data", function (data) {
      console.log(data.toString());
      result += data.toString();
    });

    childProcess.once("error", (status) => {
      childProcess.removeAllListeners("close");
      reject(new Error("script process returned non 0 status"));
    });
  });

  return result;
}


async function main() {
  const promises = [];

  const publicIPDir = path.join('.', 'public_ips');
  const publicIpFiles = fs.readdirSync(publicIPDir);
  for (const ipFile of publicIpFiles) {
    const ips = fs.readFileSync(path.join(publicIPDir, ipFile), 'utf-8');
    const ipArr = ips.split('\n').filter(Boolean);

    let ext = os.platform() === 'darwin' ? 'cer' : 'pem';

    // aws key pair name is constructed as :: zchain-<region>.pem/cer
    const keyPairFile = `zchain-${ipFile.split('.txt')[0]}.${ext}`;
    for (const ip of ipArr) {
      promises.push( runNode(keyPairFile, ip) );
    }
  }

  // run all promises parallely (so we don't need to exit from the zchain nodes on ec2's)
  await Promise.all(promises);
}

main();
