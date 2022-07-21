import Libp2p from "libp2p";
import path from "path";
import {
  PeerMeta, PrivateYDoc,
  PublicYDoc, YDocs, ZChainMessage
} from "../types";
import { decode, encode } from "./encryption";

import chalk from "chalk";
import { assertValidzId } from "./zid";
import { DB_PATH } from "./constants";
import Web3 from 'web3';
import * as Y from 'yjs';
import Provider from 'y-libp2p'
import { LeveldbPersistence } from 'y-leveldb'

// zchain operations are at the "system" level
const SYSPATH = 'sys';

function isValidzId(zId: string): Boolean {
  let isValid = true;
  try {
    assertValidzId(zId);
  } catch (error) {
    isValid = false;
  }

  return isValid;
}

/**
 * Class to handle data of libp2p libp2p (persisting data through hypercore append only logs)
 * + Store(append) newly discovered peers to logs
 */
export class ZStore {
  protected libp2p: Libp2p;
  private password: string;
  private feedMap: Map<string, number>

  yDocs: YDocs;
  publicYDoc: PublicYDoc;
  privateYDoc: PrivateYDoc;
  persistence: LeveldbPersistence;
  providers: { [key: string] : Provider }

  /**
   * Initializes zchain-db (hypercore append only log)
   * @param libp2p libp2p node
   */
  constructor (libp2p: Libp2p, password: string) {
    this.libp2p = libp2p;

    // going through "type hacks" (as they'll be initialized later)
    this.feedMap = new Map<string, number>();

    this.yDocs = {} as any;
    this.yDocs.feeds = {};
    this.publicYDoc = {} as any;
    this.privateYDoc = {} as any;
    this.providers = {} as any;

    // save password
    if (password.length !== 16) {
      throw new Error("Password must be a string of length 16");
    } else {
      this.password = password;
    }
  }

  async init(zIdName: string): Promise<void> {
    this.persistence = new LeveldbPersistence(path.join(DB_PATH, zIdName));

    // eg. ./zchain-db/{peerId}/sys/<log>
    const peerID = this.libp2p.peerId.toB58String();
    const feedPath = peerID + "." + SYSPATH + ".feed";

    // initialize private yDoc & feed(ydoc array)
    this.yDocs.feeds[peerID] = {} as any;
    this.yDocs.feeds[peerID].doc = await this.initYDoc(feedPath);
    this.yDocs.feeds[peerID].feedArray = this.yDocs.feeds[peerID].doc.getArray("feed");

    this.persistOnYDocUpdate(
      feedPath,
      this.yDocs.feeds[peerID].doc,
      this.persistence
    );

    // init public ydoc
    this.publicYDoc.doc = await this.initYDoc("publicYDoc");
    this.publicYDoc.metaData = this.publicYDoc.doc.getMap("metaData");
    this.persistOnYDocUpdate("publicYDoc", this.publicYDoc.doc, this.persistence);

    // init private ydoc
    this.privateYDoc.doc = await this.persistence.getYDoc("privateYDoc") ?? new Y.Doc();
    this.privateYDoc.addressBook = this.privateYDoc.doc.getMap("addressBook");
    this.persistOnYDocUpdate("privateYDoc", this.privateYDoc.doc, this.persistence);
  }

  /**
   * Initialize a yDoc:
   * + Load from memory (by document name)
   * + Initialize provider
   * + return provider.ydoc
   * @param yDocName name of doc
   */
  async initYDoc(yDocName: string): Promise<Y.Doc> {
    const yDoc = await this.persistence.getYDoc(yDocName) ?? new Y.Doc();
    const provider = new Provider(yDoc, this.libp2p, yDocName);
    provider.aggressivelyKeepPeersUpdated = true;
    this.providers[yDocName] = provider;

    return provider.awareness.doc;
  }

  /**
   * Save to database (level-db) on any yDoc update
   * @param yDocName name of the ydoc
   * @param yDoc ydoc
   */
  persistOnYDocUpdate(yDocName: string, yDoc: Y.Doc, persistence: LeveldbPersistence) {
    yDoc.on('update', function(update: Uint8Array, origin: any, doc: Y.Doc) {
      //console.log("Got update for yDOC :: ", yDocName);
      persistence.storeUpdate(yDocName, Y.encodeStateAsUpdate(doc));
    })
  }

  async appendZChainMessageToFeed(
    yArray: Y.Array<unknown>,
    message: string,
    channels: string[],
    network?: string
    ): Promise<void> {

    // verify you cannot spoof a signature, like i can't just copy it & spam it
    const zChainMessage = {
      from: this.libp2p.peerId.toB58String(),
      network: network ?? undefined,
      channels: channels,
      message: await encode(message, this.password),
      // timestamp: Math.round(+new Date() / 1000),
    }

    yArray.push([zChainMessage]);
  }

  /**
   * Handle publishing of a message
   * @param channel channel accross which message was published
   * @param message libp2p pubsub message
   * @param network network on which the channel belongs
   */
  async handlePublish(message: string, channels: string[], network?: string): Promise<void> {
    // only append to my feed a single time (eg. if we're publishing same
    // message accross multiple channels, we only want to append it to feed single time)
    const currTs = Math.round(+new Date() / 10000);
    if (this.feedMap.get(message + currTs.toString()) === undefined) {
      const myfeedDoc = this.yDocs.feeds[this.libp2p.peerId.toB58String()];
      await this.appendZChainMessageToFeed(myfeedDoc.feedArray, message, channels, network);
      this.feedMap.set(message + currTs.toString(), 1);
    }
  }


  /**
   * Returns last "n" messages published by a node
   */
  async getMessagesOnFeed(peerIdStr: string, n: number): Promise<Object[]> {
    const feedArray = this.yDocs.feeds[peerIdStr].feedArray;
    if (feedArray === undefined) {
      console.error("feed store not found for peer ", peerIdStr);
      return [];
    }

    let messages: any[];
    if (feedArray.length <= n) {
      messages = feedArray.toJSON();
    } else {
      messages = feedArray.slice(feedArray.length - n, feedArray.length);
    }

    const messagesOnFeed = [];
    for (const m of messages) {
      if (m === undefined) { continue; }

      const msg = m as ZChainMessage;
      messagesOnFeed.push({
        ...msg,
        message: await decode(msg.message, this.password)
      });
    }

    return messagesOnFeed.reverse();
  }

  /**
   * Determines {peerId, name, display string} for given peerId/name
   */
  getNameAndPeerID(peerIdOrName: string): [string, string | undefined, string] {
    let peerId: string, name: string | undefined, str: string;
    if (isValidzId(peerIdOrName)) {
      peerId = peerIdOrName;
      name = this.privateYDoc.addressBook.get(peerId) as string | undefined;
      str = name !== undefined ? `${peerId} (${name})` : `${peerId}`
    } else {
      name = peerIdOrName;

      // if you get a name, peerID must be defined
      if (this.privateYDoc.addressBook.get(name) === undefined) {
        throw new Error(chalk.red(`No peer id found for name ${name}`));
      } else {
        peerId = this.privateYDoc.addressBook.get(name) as string;
        str = `${peerId} (${name})`;
      }
    }

    return [peerId, name, str];
  }

  /**
   * Sets a name of the peerId in the local address book
   * @param peerId peerID
   * @param name name to set
   */
  async setNameInAddressBook(peerId: string, name: string, force: boolean = false): Promise<void> {
    assertValidzId(peerId);

    let addressBookMap = this.privateYDoc.addressBook; // ymap
    if (!addressBookMap) {
      console.log("Internal error: address book db not defined in ctx");
      return;
    }

    const peerName = await addressBookMap.get(peerId);
    const peerID = await addressBookMap.get(name);
    if (force === true) {
      // remove old names
      if (peerName) addressBookMap.delete(peerName as string);
      if (peerID) addressBookMap.delete(peerID as string);

      // set new names
      addressBookMap.set(peerId, name);
      addressBookMap.set(name, peerId);
    } else {
      if (peerName !== undefined) {
        console.warn(chalk.yellowBright(`Name for peer ${peerId} has already been set to ${peerName}`));
        return;
      } else if (peerID !== undefined) {
        console.warn(chalk.yellowBright(`A peerId has already been set against this name (${name}) to ${peerID}`));
        return;
      } else {
        addressBookMap.set(peerId, name);
        addressBookMap.set(name, peerId);
      }
    }

    console.info(chalk.green(`Successfully set name for ${peerId} to ${name} in local address book`));
  }


  async addEthAddressAndSignature(
    ethAddress: string,
    ethSignature: string,
    setAsDefault: boolean = false
  ) {
    const web3 = new Web3(Web3.givenProvider);
    if (!ethAddress || !web3.utils.isAddress(ethAddress)) {
      throw new Error(chalk.red(`Incorrect ethereum address given`));
    }

    if (!ethSignature) {
      throw new Error(chalk.red(`No signature given`));
    }

    // address verification
    const checkSumAddress = web3.utils.toChecksumAddress(ethAddress);
    try{
      let claimedAddress = web3.eth.accounts.recover(this.libp2p.peerId.toB58String(), ethSignature)
      if(claimedAddress === checkSumAddress){
        console.info(chalk.green(`Ethereum address verified`));
      } else {
        throw new Error(chalk.red(`Wrong signature provided`));
      }
    } catch(e) {
      throw new Error(e);
    }

    const peerMeta = (await this.publicYDoc.metaData.get(this.libp2p.peerId.toB58String()) ?? {}) as PeerMeta;
    const meta = peerMeta.meta ?? [];
    for (const m of meta) {
      if (m.ethAddress === checkSumAddress) {
        console.warn(chalk.yellow(`Signature has already been set for ethereum address ${ethAddress}`));
        return;
      }
    }

    const metaDataToSave = [
      ...meta, {
        "ethAddress": checkSumAddress,
        "sig": ethSignature
      }
    ];

    let defaultAddress: string;
    if (setAsDefault === true || meta.length === 0) {
      defaultAddress = checkSumAddress
    } else {
      defaultAddress = peerMeta.defaultAddress;
    }

    await this.publicYDoc.metaData.set(this.libp2p.peerId.toB58String(), {
      defaultAddress: defaultAddress,
      meta: metaDataToSave
    });

    console.info(chalk.green(`Successfully added ethAddress & signature in metadata db`));
  }


  async updateDefaultEthAddress(ethAddress: string) {
    const web3 = new Web3(Web3.givenProvider);
    const checkSumAddress = web3.utils.toChecksumAddress(ethAddress);
    const peerMeta = (await this.publicYDoc.metaData.get(this.libp2p.peerId.toB58String()) ?? {}) as PeerMeta;
    const meta = peerMeta.meta ?? [];

    let found = false;
    for (const m of meta) {
      if (m.ethAddress === checkSumAddress) {
        found = true;
        break;
      }
    }

    if (found === false) {
      throw new Error(chalk.red(`Address ${ethAddress} not found in metadata db. Please use addEthAddressAndSignature to add ethereum address and signature first`));
    }

    await this.publicYDoc.metaData.set(this.libp2p.peerId.toB58String(), {
      defaultAddress: checkSumAddress,
      meta: meta
    });

    console.info(chalk.green(`Successfully set default eth address to ${ethAddress} in metadata db`));
  }

  /**
   * @param peerID
   * @returns peerMeta :: { defaultAddress: <addr>, meta: [ { ethaddress, sig }, {..} ] }
   */
  async getPeerEthAddressAndSignature(peerID: string): Promise<Object> {
    assertValidzId(peerID);

    return await this.publicYDoc.metaData.get(peerID);
  }
}
