import delay from "delay";
import { MEOW } from "./meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('n3o.json'); // initializes local zchain

  // 3s delay for discovery and connection of other peers
  await delay(3 * 1000);

  // tweet by meow
  await meow.sendMeow(`Thrilled to join the football gaming revolution
  with @UFLgame bringing the new #fairtoplay experience to
  football gamers worldwide! See you in the Game soon! #ucl`);

  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';

  // follow ratik
  await meow.follow(ratikId);
  meow.listFollowers();

  // display last 5 messages posted by ratik
  await delay(6 * 1000);
  await meow.displayFeed(ratikId, 5);
})()
  .catch(err => { throw new Error(err); });
