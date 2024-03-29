import delay from "delay";
import { MEOW } from "../meow.js";

;(async () => {
  const meow = new MEOW();
  await meow.init('ratik'); // initializes local zchain at ~/.zchain/ipfs/ratik

  // 5s delay for discovery and connection of other peers
  await delay(5 * 1000);

  // add channels in network
  await meow.addChannelInNetwork('0://default.network', '#ucl');
  await meow.addChannelInNetwork('0://default.network', '#programming');

  await meow.followChannel('#ucl');

  // tweet by meow
  await meow.sendMeow(`This is first message #ucl`);

  await delay(2 * 1000);
  await meow.sendMeow(`This is second message #ucl`);

  await delay(2 * 1000);
  await meow.sendMeow(`This is third message #programming`);
})()
  .catch(err => {
    console.log('E ', err);
    throw new Error(err); });
