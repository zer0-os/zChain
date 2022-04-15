process.env.ALLOW_CONFIG_MUTATIONS = "true";
import importFresh from 'import-fresh';
import { ZCHAIN } from "zchain-core";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import Web3 from 'web3';
import { GraphQLClient, gql } from 'graphql-request'
import prompt from 'prompt';
import fs from 'fs';
import config from "config";
import jwkToPem from 'jwk-to-pem'
import crypto from "crypto";
import {ZScreen} from "./zScreen.js";
import {IP2Location} from "ip2location-nodejs";

const configFile = './config/default.json';
var fileJson = JSON.parse(fs.readFileSync(configFile))
prompt.start();


const publicWebRTCStarServers = [
  '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
  '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
];
const password = 'jindalratik@1234';
const authTopic = "authentication"
const encryptedTopic = "encryptedMessages"
let destNode;
var nodeTopics = [authTopic,encryptedTopic];

let web3,nodeAuthData,graphClient;
var verifiedNodesArray=[];
var storedNodes =[];
var isConnectedTab = false;
var tabSelectedItem=""
let zScreen;
;(async () => {
	let ip2location = new IP2Location();
	ip2location.open("./ip2loc/ip2location.bin");
	zScreen = new ZScreen()
        zScreen.screen.render()
	let myNode = new ZCHAIN();
        await myNode.initialize('bustawei.json', password,publicWebRTCStarServers);
	destNode = myNode.node.peerId.toB58String()
	const encryptedMessage = await encryptMessage("Hello world",myNode.node.peerId)
	zScreen.choiceListBox.on("element click",function(selectedItem,mouse){
		if(selectedItem.content == "Connections"){
			isConnectedTab = true;
			zScreen.drawConnectionsBox(storedNodes);
			zScreen.screen.render()
		}
		if(selectedItem.content =="Profile"){
			isConnectedTab =false;
			zScreen.drawProfileBox();
			autoCompleteProfileBox();
			zScreen.screen.render()
		}
	});
	setInterval(async()=>{
		if(isConnectedTab){
			zScreen.drawConnectionsBox(storedNodes)
			zScreen.screen.render()
			zScreen.verifiedNodesList.on("element click",async function(element,mouse){
                		isConnectedTab = false;
				var targetAddress="";
				verifiedNodesArray.forEach(node =>{
					if(node[0] === element.content)
						targetAddress = node[1]
				});
                		var ownedZnas = await getZnaFromSubgraph(targetAddress,graphClient)
                		zScreen.drawOwnedZnasBox(ownedZnas)
				zScreen.screen.render()
        });
		}
	},5000);
	myNode.peerDiscovery.onConnect((connection) => {
		zScreen.connectionsLogBox.log("Connected to : "+connection.remotePeer.toB58String())
		var connectionIp = connection.remoteAddr.toString().split("/")[2]
		var connectionLat = ip2location.getLatitude(connectionIp)
		var connectionLon = ip2location.getLongitude(connectionIp)
		zScreen.mapBox.addMarker({"lon" : connectionLon, "lat" : connectionLat, color: "red", char: "X"})
		zScreen.screen.render()
	});
	myNode.peerDiscovery.onDiscover((peerId) => {
		zScreen.connectionsLogBox.log("Discovered :"+peerId.toB58String())
		zScreen.screen.render()
	});
	setInterval(async () => {
		var encapsulatedMessage = {destNode,encryptedMessage}
                await myNode.publish(encryptedTopic, JSON.stringify(encapsulatedMessage));
        }, 10000);
	myNode.node.pubsub.on(encryptedTopic, async (msg) => {
		var msgReceived = uint8ArrayToString(msg.data)
		msgReceived = JSON.parse(msgReceived)
		var msgSender = msg.receivedFrom
		if(msgReceived.destNode == myNode.node.peerId.toB58String()){
			var decryptedMessage = await decryptMessage(msgReceived.encryptedMessage,myNode.node.peerId)
			zScreen.subscribedTopicsLog.log("received "+decryptedMessage+" from "+msgSender+" in topic "+encryptedTopic)
		}
        });

	//check if already initialized
	if(config.get("ethAddress") !== "" && config.get("ethSig") !== "" && config.get("friendlyName") !== "")
	{
		//implement the ability to change address and friendly name ...
	}
	else{
		await promptConfig(myNode.node.peerId.toB58String())
	}
	await initConfig();
	await autoCompleteProfileBox();
	setInterval(async () => {
		await myNode.publish(authTopic, JSON.stringify(nodeAuthData));
	}, 10000);
	myNode.node.pubsub.on(authTopic, async (msg) => {
		var msgReceived = uint8ArrayToString(msg.data)
		var msgSender = msg.receivedFrom
		var [verifiedAddress,ownedZnas] = await verifyNode(msg.receivedFrom,msg.data,graphClient)
		if(verifiedAddress){
			storedNodes.push(msgSender)
			verifiedNodesArray.push([msgSender,verifiedAddress])
			zScreen.subscribedTopicsLog.log("authenticated "+msgSender+" with address "+verifiedAddress+" in topic "+authTopic)
		}
		if(ownedZnas){
		}
	});
	
	myNode.subscribe(authTopic)
	myNode.subscribe(encryptedTopic)
	await myNode.node.start();

})();


async function autoCompleteProfileBox(){
	zScreen.profileNodeId.content = destNode;
	zScreen.profileNodeFn.value = config.get("friendlyName")
        zScreen.profileNodeAddress.value = config.get("ethAddress")
        zScreen.profileNodeSig.value = config.get("ethSig")
}
async function decryptMessage(msg,myPeerId){
	var rsaPrivateKey = jwkToPem(myPeerId.privKey._key,{private: true})
	msg = Buffer.from(msg,"base64")
	return(crypto.privateDecrypt({
		key: rsaPrivateKey,
		padding: crypto.constants.RSA_PKCS1_PADDING,
	},msg));
}
async function encryptMessage(msg,peerId){
	var rsaPubKey = jwkToPem(peerId.pubKey._key)
	var encryptedMessage = crypto.publicEncrypt({
		key: rsaPubKey,
		padding: crypto.constants.RSA_PKCS1_PADDING,
	},Buffer.from(msg));
	return encryptedMessage.toString("base64")
}
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
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
