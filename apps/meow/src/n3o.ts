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

  /********    Following a peer    *********/
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';

  // follow ratik
  await meow.followZId(ratikId);
  meow.listFollowedPeers();

  // display last 5 messages posted by ratik
  await delay(6 * 1000);
  await meow.displayFeed(ratikId, 5);

  /********    Following a topic    *********/

  await meow.followTopic('#ucl');
  meow.listFollowedTopics();

  await delay(6 * 1000);
  await meow.displayTopicFeed('#ucl', 3); // display last 3 messages on topic #ucl
})()
  .catch(err => { throw new Error(err); });
