import delay from "delay";
import { MEOW } from "../meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('ratik'); // initializes local zchain at ~/.zchain/ipfs/ratik

  // // 5s delay for discovery and connection of other peers
  // await delay(2 * 1000);

  await meow.followChannel('#ucl');

  // tweet by meow
  await meow.sendMeow(`This is first message #ucl`);

  await delay(2 * 1000);
  await meow.sendMeow(`This is second message #ucl`);

  await delay(2 * 1000);
  await meow.sendMeow(`This is third message #programming`);

  // setInterval(async () => {
  //   console.log("P: ", await meow.zchain.ipfs.swarm.peers());
  // }, 4000);
})()
  .catch(err => {
    console.log('E ', err);
    throw new Error(err); });
