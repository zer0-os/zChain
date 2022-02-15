import delay from "delay";
import { MEOW } from "./meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('matt.json'); // initializes local zchain

//   await delay(1000);

//   // tweet by meow
//   meow.tweet(`Thrilled to join the football gaming revolution
//  with @UFLgame bringing the new #fairtoplay experience to
//  football gamers worldwide! See you in the Game soon! #ucl`);
})();