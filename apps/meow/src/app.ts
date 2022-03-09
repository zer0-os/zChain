import delay from "delay";

import { MEOW } from "./meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('ratik.json'); // initializes local zchain

  // 5s delay for discovery and connection of other peers
  await delay(5 * 1000);

  // tweet by meow
  await meow.sendMeow(`Thrilled to join the football gaming revolution
 with @UFLgame bringing the new #fairtoplay experience to
 football gamers worldwide! See you in the Game soon! #ucl`);
})()
  .catch(err => { throw new Error(err); });
