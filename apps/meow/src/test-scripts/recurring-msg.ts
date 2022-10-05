import delay from "delay";
import { MEOW } from "../meow";

;(async () => {
  const meow = new MEOW();
  await meow.init('test-sim');

  // 5s delay for discovery and connection of other peers
  await delay(5 * 1000);

  let ctr = 0;
  setInterval(async () => {
    const message = `This is message ${++ctr} #zero`;
    await meow.sendMeow(message);
  }, 20 * 1000);
})()
  .catch(err => {
    console.log('E ', err);
    throw new Error(err); });
