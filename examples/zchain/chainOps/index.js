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

let web3,nodeAuthData,graphClient;
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
		await promptConfig(myNode.peer.peerId.toB58String())
	}
	await initConfig()

	setInterval(async () => {
		await myNode.publish(authTopic, JSON.stringify(nodeAuthData));
	}, 10000);
	myNode.node.pubsub.on(authTopic, async (msg) => {
		var msgReceived = uint8ArrayToString(msg.data)
		var msgSender = msg.receivedFrom
		var [verifiedAddress,ownedZnas] = await verifyNode(msg.receivedFrom,msg.data,graphClient)
		console.log("node with ID :"+msgSender)
		if(verifiedAddress)
			console.log("proved that it onws eth address "+verifiedAddress)
		if(ownedZnas){
			console.log("we could find this domains owned by this address :")
			console.log(ownedZnas)
		}
	});
	myNode.subscribe(authTopic)
	await myNode.node.start();

})();

async function verifyNode(msgSender,msgReceived,graphClient){
	msgReceived = uint8ArrayToString(msgReceived)
	msgReceived = JSON.parse(msgReceived)
	let ownedZnas,ownedAddress
        if(msgReceived.ethAddress && msgReceived.ethSig){
		var claimedAddress = await web3.eth.accounts.recover(msgSender,msgReceived.ethSig)
		if(claimedAddress == web3.utils.toChecksumAddress(msgReceived.ethAddress)){
                                /* dev comments
                                        -Here we verified that the peer Id owns that eth address
                                        -Storing this node in db with address
                                        -Discard authentication messages later if similar address is receive
                                        -We can get zns from subgraph that are owned by this address
                                */
			ownedAddress = msgReceived.ethAddress
			ownedZnas = await getZnaFromSubgraph(msgReceived.ethAddress,graphClient)
			//ownedZnas = await getZnaFromSubgraph("0x003f6b20bfa4b5cab701960ecf73859cb3c095fc",graphClient)
                }
	}
	return [ownedAddress,ownedZnas]
}
async function promptConfig(myNodeId){
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
async function getZnaFromSubgraph(address,graphClient){
	address = address.toLowerCase()
	const graphQuery = gql`{
		account(id:"${address}"){
			ownedDomains {
				id
				name
			}
		}
	}`
	var ownedDomains = await graphClient.request(graphQuery)
	console.log(ownedDomains)
	if(ownedDomains.account && ownedDomains.account.ownedDomains)
		return ownedDomains.account.ownedDomains
}
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
