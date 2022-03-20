import delay from "delay";
import { MEOW } from "./meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('ratik.json'); // initializes local zchain

  // 5s delay for discovery and connection of other peers
  await delay(5 * 1000);

  // tweet by meow
  await meow.sendMeow(`This is second message #ucl`);
  await meow.sendMeow(`This is third message #ucl`);
})()
  .catch(err => { throw new Error(err); });
