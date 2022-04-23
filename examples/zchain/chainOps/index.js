process.env.ALLOW_CONFIG_MUTATIONS = "true";
import importFresh from 'import-fresh';
import {
    ZCHAIN,
    types,
    decode
} from "zchain-core";
import {
    MEOW
} from "meow-app"
import {
    toString as uint8ArrayToString
} from "uint8arrays/to-string";
import Web3 from 'web3';
import {
    GraphQLClient,
    gql
} from 'graphql-request'
import prompt from 'prompt';
import fs from 'fs';
import config from "config";
import jwkToPem from 'jwk-to-pem'
import crypto from "crypto";
import {
    ZScreen
} from "./zScreen.js";
import {
    IP2Location
} from "ip2location-nodejs";

const configFile = './config/default.json';
var fileJson = JSON.parse(fs.readFileSync(configFile))
prompt.start();


const password = 'ratikjindal@3445';
const authTopic = "authentication"
//const encryptedTopic = "encryptedMessages"
let destNode;
var nodeTopics = [authTopic];

let web3, nodeAuthData, graphClient;
var verifiedNodesArray = [];
var storedNodes = [];
var isConnectedTab = false;
var tabSelectedItem = ""
let zScreen, myMeow;;
(async () => {
    for (let func in console) {
        if (func == "error") continue;
        console[func] = function() {};
    }
    myMeow = new MEOW();
    await myMeow.init('bustawei.json');
    let myNode = myMeow.zchain;
    await myMeow.followChannel("#" + authTopic)
    if (config.get("ethAddress") !== "" && config.get("ethSig") !== "" && config.get("friendlyName") !== "") {} else {
        await promptConfig(myNode.node.peerId.toB58String())
    }
    await initConfig();
    let ip2location = new IP2Location();
    ip2location.open("./ip2loc/ip2location.bin");
    zScreen = new ZScreen()
    zScreen.screen.render()
    destNode = myNode.node.peerId.toB58String()
    await autoCompleteProfileBox();
    console["log"] = function(text) {
        if(text.length > 20)
            zScreen.subscribedTopicsLog.log(text)
    }
    zScreen.choiceListBox.on("element click", function(selectedItem, mouse) {
        if (selectedItem.content == "VERIFIED NODES") {
            isConnectedTab = true;
            zScreen.drawConnectionsBox(storedNodes);
            zScreen.screen.render()
        }
        if (selectedItem.content == "PROFILE") {
            isConnectedTab = false;
            zScreen.drawProfileBox();
            autoCompleteProfileBox();
            zScreen.screen.render()
        }
        if (selectedItem.content == "MEOW CHAT") {
            if (isConnectedTab)
                isConnectedTab = false;
            nodeTopics = myMeow.store.meowDbs.followingChannels.all;
            zScreen.drawTopicsBox(Object.keys(nodeTopics));
            zScreen.screen.render()
            zScreen.screen.on("keypress", async function(ch, key) {
                if (key.full == "delete") {
                    let targetTopic = zScreen.topicsBox.getItem(zScreen.topicsBox.selected).content
                    if (targetTopic && zScreen.choiceListBox.getItem(zScreen.choiceListBox.selected).content == "Meow chat") {
                        await myMeow.unFollowChannel(targetTopic)
                        nodeTopics = myMeow.store.meowDbs.followingChannels.all;
                        zScreen.drawTopicsBox(Object.keys(nodeTopics));
                        zScreen.topicsBox.on("element click", handleTopicsBoxClick)
                        zScreen.submitTopicCreateButton.on("click", handleTopicCreate)
                        zScreen.screen.render()
                    }

                }
            });
            zScreen.topicsBox.on("element click", handleTopicsBoxClick)
            zScreen.submitTopicCreateButton.on("click", handleTopicCreate)
        }
    });
    setInterval(async () => {
        if (isConnectedTab) {
            zScreen.drawConnectionsBox(storedNodes)
            zScreen.screen.render()
            zScreen.verifiedNodesList.on("element click", async function(element, mouse) {
                isConnectedTab = false;
                var targetAddress = "";
                verifiedNodesArray.forEach(node => {
                    if (node[0] === element.content)
                        targetAddress = node[1]
                });
                var ownedZnas = await getZnaFromSubgraph(targetAddress, graphClient)
                if (ownedZnas) {
                    zScreen.drawOwnedZnasBox(ownedZnas)
                    zScreen.screen.render()
                }
            });
        }
    }, 5000);
    myNode.peerDiscovery.onConnect((connection) => {
        zScreen.connectionsLogBox.log("Connected to : " + connection.remotePeer.toB58String())
        if (connection.remoteAddr) {
            var connectionIp = connection.remoteAddr.toString().split("/")[2]
            var connectionLat = ip2location.getLatitude(connectionIp)
            var connectionLon = ip2location.getLongitude(connectionIp)
            zScreen.mapBox.addMarker({
                "lon": connectionLon,
                "lat": connectionLat,
                color: "red",
                char: "X"
            })
            zScreen.screen.render()
        }
    });
    myNode.peerDiscovery.onDiscover((peerId) => {
        zScreen.connectionsLogBox.log("Discovered :" + peerId.toB58String())
        zScreen.screen.render()
    });

    await myMeow.sendMeow(JSON.stringify(nodeAuthData) + "#" + authTopic);
    setInterval(async () => {
        let authFeed = await myMeow.store.getChannelFeed(authTopic, 10);
        for (const msg of authFeed) {
            let msgFrom = msg.from
            if (storedNodes.indexOf(msgFrom) < 0) {
                try {
                    let msgValue = await decode(msg.message, password)
                    msgValue = msgValue.replace(/#\w+/g, "")
                    let [verifiedAddress, ownedZnas, friendlyName] = await verifyNode(msgFrom, msgValue, graphClient)
                    if (verifiedAddress) {
                        storedNodes.push(msgFrom)
                        verifiedNodesArray.push([msgFrom, verifiedAddress, friendlyName])
                        zScreen.subscribedTopicsLog.log("authenticated " + msgFrom + " with address " + verifiedAddress + " in topic " + authTopic)
                    }

                } catch (err) {
                    console.log("authentication not succesful")
                    console.log(err)
                }
            }
        }

    }, 10000);
    await myNode.node.start();

})();

async function handleTopicCreate() {
    let newTopic = zScreen.topicCreateName.content
    zScreen.topicCreateName.destroy()
    await myMeow.followChannel(newTopic);
    nodeTopics = myMeow.store.meowDbs.followingChannels.all;
    zScreen.drawTopicsBox(Object.keys(nodeTopics));
    zScreen.topicsBox.on("element click", handleTopicsBoxClick)
    zScreen.screen.render()
}
async function handleTopicsBoxClick() {
    let topicChannel = zScreen.topicsBox.getItem(zScreen.topicsBox.selected).content
    zScreen.topicsWrapper.destroy()
    if (topicChannel) {
        zScreen.topicsBox.removeListener("element click");
        zScreen.drawTopicChatBox(topicChannel)
        if (myMeow.store.meowDbs.followingChannels.get(topicChannel)) {
            const channelMessages = await myMeow.store.getChannelFeed(topicChannel, 15)
            for (const msg of channelMessages) {
                let nodeFriendlyName = ""
                for (const verifiedNode of verifiedNodesArray) {
                    if (verifiedNode[0] === msg.from) {
                        nodeFriendlyName = "(" + verifiedNode[2] + ")"
                    }
                }
                let msgFrom = msg.from + nodeFriendlyName
                try {
                    let msgValue = await decode(msg.message, password)
                    msgValue = msgValue.replace(/#\w+/g, "")
                    let msgTimestamp = msg.timestamp
                    zScreen.topicChatLogs.log(msgFrom.substring(20) + " : " + msgValue)
                } catch (err) {
                    console.log("wrong password")
                }
            }
        }
        zScreen.submitTopicChatButton.on("click", handleSendMeow)
        zScreen.screen.render()
    }

}
async function handleSendMeow() {
    let msgToSend = zScreen.topicChatNew.content
    let msgTopic = zScreen.topicChatBox.name
    zScreen.topicChatBox.destroy()
    zScreen.topicChatNew.destroy()
    await myMeow.sendMeow(msgToSend + " " + msgTopic)
    zScreen.drawTopicChatBox(msgTopic)
    let topicChannel = msgTopic
    if (myMeow.store.meowDbs.followingChannels.get(topicChannel)) {
        const channelMessages = await myMeow.store.getChannelFeed(topicChannel, 15)
        for (const msg of channelMessages) {
            let nodeFriendlyName = ""
            for (const verifiedNode of verifiedNodesArray) {
                if (verifiedNode[0] === msg.from) {
                    nodeFriendlyName = "(" + verifiedNode[2] + ")"
                }
            }
            let msgFrom = msg.from + nodeFriendlyName

            try {
                let msgValue = await decode(msg.message, password)
                msgValue = msgValue.replace(/#\w+/g, "")
                let msgTimestamp = msg.timestamp
                zScreen.topicChatLogs.log(msgFrom.substring(20) + " : " + msgValue)
            } catch (err) {
                console.log("wrong password")
            }
        }
    }
    zScreen.submitTopicChatButton.removeListener("click")
    zScreen.submitTopicChatButton.on("click", handleSendMeow)
    zScreen.screen.render()
}
async function autoCompleteProfileBox() {
    var configFresh = importFresh("config");
    zScreen.profileNodeId.content = destNode;
    zScreen.profileNodeFn.value = configFresh.get("friendlyName")
    zScreen.profileNodeAddress.value = configFresh.get("ethAddress")
    zScreen.profileNodeSig.value = configFresh.get("ethSig")
}
async function decryptMessage(msg, myPeerId) {
    var rsaPrivateKey = jwkToPem(myPeerId.privKey._key, {
        private: true
    })
    msg = Buffer.from(msg, "base64")
    return (crypto.privateDecrypt({
        key: rsaPrivateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
    }, msg));
}
async function encryptMessage(msg, peerId) {
    var rsaPubKey = jwkToPem(peerId.pubKey._key)
    var encryptedMessage = crypto.publicEncrypt({
        key: rsaPubKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
    }, Buffer.from(msg));
    return encryptedMessage.toString("base64")
}
async function verifyNode(msgSender, msgReceived, graphClient) {
    msgReceived = JSON.parse(msgReceived)
    let ownedZnas, ownedAddress, friendlyName
    if (msgReceived.ethAddress && msgReceived.ethSig) {
        try {
            var claimedAddress = await web3.eth.accounts.recover(msgSender, msgReceived.ethSig)
            if (claimedAddress == web3.utils.toChecksumAddress(msgReceived.ethAddress)) {
                ownedAddress = msgReceived.ethAddress
                friendlyName = msgReceived.friendlyName
                ownedZnas = await getZnaFromSubgraph(msgReceived.ethAddress, graphClient)
            }
        } catch (err) {
            console.log("received wrong ethereum data");
        }
    }
    return [ownedAddress, ownedZnas, friendlyName]
}
async function promptConfig(myNodeId) {
    const {
        friendlyName,
        ethAddress,
        ethSig
    } = await prompt.get({
        properties: {
            friendlyName: {
                description: "What friendly name do you choose for your node ?"
            },
            ethAddress: {
                pattern: /^0x[a-fA-F0-9]{40}$/,
                required: true,
                message: "Must be a valid ethereum address",
                description: "What is your ethereum address ?"
            },
            ethSig: {
                description: "sign this " + myNodeId + " with your address and provide it "
            }
        }
    });
    await setConfig(friendlyName, ethAddress, ethSig)
}
async function getZnaFromSubgraph(address, graphClient) {
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
    if (ownedDomains.account && ownedDomains.account.ownedDomains)
        return ownedDomains.account.ownedDomains
}
async function initConfig() {
    var configFresh = importFresh("config");
    web3 = new Web3(new Web3.providers.HttpProvider(configFresh.get("providerUrl")))
    nodeAuthData = {
        ethAddress: configFresh.get("ethAddress"),
        ethSig: configFresh.get("ethSig"),
        friendlyName: configFresh.get("friendlyName")
    }

    graphClient = new GraphQLClient(configFresh.get("graphQlEndpoint"))
}
async function setConfig(friendlyName, ethAddress, ethSig) {
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
