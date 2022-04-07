import { ZCHAIN } from "zchain-core";
import  config from "config";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import Web3 from 'web3';

const publicWebRTCStarServers = [
  '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
  '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
];
const password = 'jindalratik@1234';
const authTopic = "authentication"

const web3 = new Web3(new Web3.providers.HttpProvider(config.get("providerUrl")))
const nodeAuthData = {
		ethAddress : config.get("ethAddress"),
		ethSig : config.get("ethSig")
		     }

;(async () => {
	let myNode = new ZCHAIN();
	await myNode.initialize('bustawei.json', password,publicWebRTCStarServers);

	setInterval(async () => {
		await myNode.publish(authTopic, JSON.stringify(nodeAuthData));
	}, 10000);
	myNode.node.pubsub.on(authTopic, async (msg) => {
		var msgSender = msg.receivedFrom
		var msgReceived = uint8ArrayToString(msg.data)
		msgReceived = JSON.parse(msgReceived)
		if(msgReceived.ethAddress && msgReceived.ethSig){
			var claimedAddress = await web3.eth.accounts.recover(msgSender,msgReceived.ethSig)
			if(claimedAddress == msgReceived.ethAddress){
				console.log("Peer id :"+msgSender+" is the owner of address : "+msgReceived.ethAddress)
				/* dev comments
					-Here we verified that the peer Id owns that eth address
					-Storing this node in db with address
					-Discard authentication messages later if similar address is receive
					-We can get zns from subgraph that are owned by this address
				*/
			}
		}
	});
	myNode.subscribe(authTopic)
	await myNode.node.start();

})();
