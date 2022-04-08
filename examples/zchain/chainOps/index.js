process.env.ALLOW_CONFIG_MUTATIONS = "true";
import importFresh from 'import-fresh';
import { ZCHAIN } from "zchain-core";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import Web3 from 'web3';
import { GraphQLClient, gql } from 'graphql-request'
import prompt from 'prompt';
import fs from 'fs';
import config from "config";

const configFile = './config/default.json';
var fileJson = JSON.parse(fs.readFileSync(configFile))
prompt.start();

const publicWebRTCStarServers = [
  '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
  '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
];
const password = 'jindalratik@1234';
const authTopic = "authentication"
const graphQuery = gql`{

account(id:"0x003f6b20bfa4b5cab701960ecf73859cb3c095fc"){
    ownedDomains {
      id
      name
    }
  }

}`

let web3,nodeAuthData,graphClient;
async function initConfig(){
	var configFresh = importFresh("config");
	web3 = new Web3(new Web3.providers.HttpProvider(configFresh.get("providerUrl")))
	nodeAuthData = {
                ethAddress : configFresh.get("ethAddress"),
                ethSig : configFresh.get("ethSig")
                     }

	graphClient = new GraphQLClient(configFresh.get("graphQlEndpoint"))
}
async function setConfig(friendlyName,ethAddress,ethSig){
	fileJson.friendlyName = friendlyName
	fileJson.ethAddress = ethAddress
	fileJson.ethSig = ethSig
	await fs.writeFileSync(configFile, JSON.stringify(fileJson));

}
;(async () => {
	//init zchain
	let myNode = new ZCHAIN();
        await myNode.initialize('bustawei.json', password,publicWebRTCStarServers);

	//check if already initialized
	if(config.get("ethAddress") !== "" && config.get("ethSig") !== "" && config.get("friendlyName") !== "")
	{
		//implement the ability to change address and friendly name ...
	}
	else{
		var myNodeId = myNode.node.peerId.toB58String()
		const {friendlyName,ethAddress,ethSig} =await prompt.get({
		properties: {
			friendlyName :{
				description: "What friendly name do you choose for your node ?"
			},
			ethAddress: {
				description: "What is your ethereum address ?"
 			},
			ethSig :{
				description : "sign this "+myNodeId+" with your address and provide it "
			}
		}
		});
		await setConfig(friendlyName,ethAddress,ethSig)
	}
	await initConfig()

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
				console.log("Peer id :"+msgSender+" with the friendly Name "+config.get("friendlyName")+" is the owner of address : "+msgReceived.ethAddress)
				/* dev comments
					-Here we verified that the peer Id owns that eth address
					-Storing this node in db with address
					-Discard authentication messages later if similar address is receive
					-We can get zns from subgraph that are owned by this address
				*/
				const ownedDomains = await graphClient.request(graphQuery)
				console.log("Owned domains : ");
				console.log(ownedDomains.account.ownedDomains);
			}
		}
	});
	myNode.subscribe(authTopic)
	await myNode.node.start();

})();

