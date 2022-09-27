import delay from "delay";
import { MEOW } from "../meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('n3o');// initializes local zchain at ~/.zchain/ipfs/n3o

  // // 3s delay for discovery and connection of other peers
  // await delay(3 * 1000);

  // add channels in network
  await meow.addChannelInNetwork('0://default.network', '#ucl');
  await meow.addChannelInNetwork('0://default.network', '#fairtoplay');

  
  // tweet by meow
  await meow.sendMeow(`Thrilled to join the football gaming revolution
  with @UFLgame bringing the new #fairtoplay experience to
  football gamers worldwide! See you in the Game soon! #ucl`);

  /********    Following a peer    *********/
  const ratikId = 'QmTsUsXsRsUpvHxRNXWJKmw3RvSPN3c8Noa95Kpduu5Wcv';

  // follow ratik
  await meow.followZId(ratikId);
  meow.getFollowedPeers();

  // display last 5 messages posted by ratik
  await delay(6 * 1000);
  await meow.getPeerFeed(ratikId, 5);

  /********    Following a channel    *********/

  await meow.followChannel('#fairtoplay');

  meow.getFollowedChannels();

  await delay(6 * 1000);
  await meow.getChannelFeed('#fairtoplay', 3); // display last 3 messages on channel #ucl

  // setInterval(async () => {
  //   console.log("P: ", await meow.zchain.ipfs.swarm.peers());
  // }, 4000);

})()
  .catch(err => {
    console.log('E ', err)
    throw new Error(err); });
