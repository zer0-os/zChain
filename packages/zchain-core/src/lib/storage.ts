import Libp2p from "libp2p";
import path from "path";
import { DBs, LogPaths, PeerMeta, PrivateYDoc, PublicYDoc, PubSubMessage, YDocs, ZChainMessage } from "../types";
import { decode, encode } from "./encryption";

import { IPFS as IIPFS } from 'ipfs';
import OrbitDB from "orbit-db";
import FeedStore from "orbit-db-feedstore";
import KeyValueStore from "orbit-db-kvstore";
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
  protected ipfs: IIPFS;
  orbitdb: OrbitDB;
  private password: string;
  private paths: LogPaths;
  dbs: DBs;
  private feedMap: Map<string, number>

  yDocs: YDocs;
  publicYDoc: PublicYDoc;
  privateYDoc: PrivateYDoc;
  persistence: LeveldbPersistence;

  /**
   * Initializes zchain-db (hypercore append only log)
   * @param libp2p libp2p node
   */
  constructor (ipfs: IIPFS, libp2p: Libp2p, password: string) {
    this.ipfs = ipfs;
    this.libp2p = libp2p;

    // going through "type hacks" (as they'll be initialized later)
    this.paths = {} as any;
    this.dbs = {} as any;
    this.dbs.feeds = {};
    this.feedMap = new Map<string, number>();

    this.dbs = {} as any;
    this.dbs.feeds = {};

    this.yDocs = {} as any;
    this.yDocs.feeds = {};
    this.publicYDoc = {} as any;
    this.privateYDoc = {} as any;

    // save password
    if (password.length !== 16) {
      throw new Error("Password must be a string of length 16");
    } else {
      this.password = password;
    }
  }

  async init(zIdName: string): Promise<void> {
    this.persistence = new LeveldbPersistence(path.join(DB_PATH, zIdName));

    // const peerId = await this.ipfs.config.get('Identity.PeerID')
    // // this.orbitdb = await OrbitDB.createInstance(
    // //   this.ipfs as any,
    // //   {
    // //     directory: path.join(DB_PATH, zIdName),
    // //     peerId: peerId as string
    // //   }
    // // );

    // eg. ./zchain-db/{peerId}/sys/<log>
    this.paths.default = this.libp2p.peerId.toB58String() + "." + SYSPATH;
    this.paths.feeds = this.paths.default + '.feed';
    this.paths.addressBook = this.paths.default + '.addressBook';
    this.paths.metaData = SYSPATH + '.metaData';
    //this.paths.channels = path.join(this.paths.default, 'channels');

    // initialize private yDoc & feed(ydoc array)
    this.yDocs.feeds[this.libp2p.peerId.toB58String()] = {} as any;

    this.yDocs.feeds[this.libp2p.peerId.toB58String()].doc =
      await this.initYDoc(this.paths.feeds);
    this.yDocs.feeds[this.libp2p.peerId.toB58String()].feedArray =
      this.yDocs.feeds[this.libp2p.peerId.toB58String()].doc.getArray("feed");

    this.persistOnYDocUpdate(
      this.paths.feeds,
      this.yDocs.feeds[this.libp2p.peerId.toB58String()].doc,
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

    // this.dbs.feeds[this.libp2p.peerId.toB58String()] = await this.getFeedsOrbitDB(
    //   this.paths.feeds
    // );
    // this.dbs.addressBook = await this.getKeyValueOrbitDB(this.paths.addressBook);
    // this.dbs.metaData = await this._getMetaDataPublicDB();
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
    return provider.awareness.doc;
  }

  /**
   * Save to database (level-db) on any yDoc update
   * @param yDocName name of the ydoc
   * @param yDoc ydoc
   */
  persistOnYDocUpdate(yDocName: string, yDoc: Y.Doc, persistence: LeveldbPersistence) {
    yDoc.on('update', function(update: Uint8Array, origin: any, doc: Y.Doc) {
      console.log("Got update for yDOC :: ", yDocName);
      persistence.storeUpdate(yDocName, Y.encodeStateAsUpdate(doc));
    })
  }

  /**
   * @returns orbitdb database of the node's feed (list of messages posted by node)
   */
  getFeedDB(): FeedStore<unknown> {
    return this.dbs.feeds[this.libp2p.peerId.toB58String()];
  }

  /**
   * Initializes an orbitdb of type "keyValue"
   * @param dbName name of the database
   */
  async getKeyValueOrbitDB(dbName: string): Promise<KeyValueStore<unknown>> {
    const db = await this.orbitdb.keyvalue(dbName);
    await db.load();
    return db;
  }

  /**
   * Initialzes an orbitdb of type "feed" (mutable log with traversible history)
   * @param dbName name of the database
   */
  async getFeedsOrbitDB(dbName: string) {
    const db = await this.orbitdb.feed(dbName);
    await db.load();
    return db;
  }

  /**
   * Get public orbitdb address of the shared metadata db
   */
  private async _getMetaDataPublicDB(): Promise<KeyValueStore<unknown>> {
    const options = {
      // Give write access to ourselves
      accessController: {
        write: ['*']
      },
      meta: { data: "ethaddr-sig" }
    }
    const address = await this.orbitdb.determineAddress(
      this.paths.metaData, "keyvalue", options
    );
    const db = await this.orbitdb.open(address.toString()) as any;
    await db.load();
    return db;
  }

  async appendZChainMessageToFeed(
    feedStore: FeedStore<unknown>,
    message: string,
    channels: string[],
    network?: string
    ): Promise<void> {
    await feedStore.load(1); // load last block to memory

    // this is a bug (check it)
    let prev = null;
    const lastBlock = feedStore.iterator({ limit: 1, reverse: true }).collect()
      .map((e) => e.payload.value);
    if (lastBlock.length !== 0) {
      const parsed = lastBlock[0] as ZChainMessage;
      prev = parsed.message; // hash of prev message
    }

    // verify you cannot spoof a signature, like i can't just copy it & spam it
    const zChainMessage = {
      prev: prev,
      from: this.libp2p.peerId.toB58String(),
      network: network ?? undefined,
      channels: channels,
      message: await encode(message, this.password),
      // timestamp: Math.round(+new Date() / 1000),
    }

    await feedStore.add(zChainMessage);
  }

  async appendZChainMessageToFeed1(
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
      const feedCore = this.dbs.feeds[this.libp2p.peerId.toB58String()];
      await this.appendZChainMessageToFeed(feedCore, message, channels, network);
      this.feedMap.set(message + currTs.toString(), 1);
    }
  }

  /**
   * Handle publishing of a message
   * @param channel channel accross which message was published
   * @param message libp2p pubsub message
   * @param network network on which the channel belongs
   */
  async handlePublish1(message: string, channels: string[], network?: string): Promise<void> {
    // only append to my feed a single time (eg. if we're publishing same
    // message accross multiple channels, we only want to append it to feed single time)
    const currTs = Math.round(+new Date() / 10000);
    if (this.feedMap.get(message + currTs.toString()) === undefined) {
      const myfeedDoc = this.yDocs.feeds[this.libp2p.peerId.toB58String()];
      await this.appendZChainMessageToFeed1(myfeedDoc.feedArray, message, channels, network);
      this.feedMap.set(message + currTs.toString(), 1);
    }
  }

  /**
   * Returns last "n" messages published by a node
   */
  async getMessagesOnFeed(peerIdStr: string, n: number): Promise<Object[]> {
    const feedStore = this.dbs.feeds[peerIdStr];
    if (feedStore === undefined) {
      console.error("feed store not found for peer ", peerIdStr);
      return [];
    }

    await feedStore.load(n); // load last "n" messages to memory
    const messages = feedStore.iterator({
      limit: n, reverse: true
    }).collect();

    const messagesOnFeed = [];
    for (const m of messages) {
      const msg = m.payload.value as ZChainMessage;
      messagesOnFeed.push({
        ...msg,
        message: await decode(msg.message, this.password)
      });
    }

    return messagesOnFeed;
  }

  /**
   * Returns last "n" messages published by a node
   */
  async getMessagesOnFeed1(peerIdStr: string, n: number): Promise<Object[]> {
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
      name = this.dbs.addressBook.get(peerId) as string | undefined;
      str = name !== undefined ? `${peerId} (${name})` : `${peerId}`
    } else {
      name = peerIdOrName;

      // if you get a name, peerID must be defined
      if (this.dbs.addressBook.get(name) === undefined) {
        throw new Error(chalk.red(`No peer id found for name ${name}`));
      } else {
        peerId = this.dbs.addressBook.get(name) as string;
        str = `${peerId} (${name})`;
      }
    }

    return [peerId, name, str];
  }

  /**
   * Determines {peerId, name, display string} for given peerId/name
   */
  getNameAndPeerID1(peerIdOrName: string): [string, string | undefined, string] {
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

    let db = this.dbs.addressBook;
    if (!db) {
      console.log("Internal error: address book db not defined in ctx");
      return;
    }

    const peerName = await db.get(peerId);
    const peerID = await db.get(name);
    if (force === true) {
      // remove old names
      if (peerName) db.del(peerName as string);
      if (peerID) db.del(peerID as string);

      // set new names
      db.set(peerId, name);
      db.set(name, peerId);
    } else {
      if (peerName !== undefined) {
        console.warn(chalk.yellowBright(`Name for peer ${peerId} has already been set to ${peerName}`));
        return;
      } else if (peerID !== undefined) {
        console.warn(chalk.yellowBright(`A peerId has already been set against this name (${name}) to ${peerID}`));
        return;
      } else {
        db.set(peerId, name);
        db.set(name, peerId);
      }
    }

    console.info(chalk.green(`Successfully set name for ${peerId} to ${name} in local address book`));
  }

  /**
   * Sets a name of the peerId in the local address book
   * @param peerId peerID
   * @param name name to set
   */
  async setNameInAddressBook1(peerId: string, name: string, force: boolean = false): Promise<void> {
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

    const peerMeta = (await this.dbs.metaData.get(this.libp2p.peerId.toB58String()) ?? {}) as PeerMeta;
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

    await this.dbs.metaData.set(this.libp2p.peerId.toB58String(), {
      defaultAddress: defaultAddress,
      meta: metaDataToSave
    });

    console.info(chalk.green(`Successfully added ethAddress & signature in metadata db`));
  }

  async addEthAddressAndSignature1(
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
    const peerMeta = (await this.dbs.metaData.get(this.libp2p.peerId.toB58String()) ?? {}) as PeerMeta;
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

    await this.dbs.metaData.set(this.libp2p.peerId.toB58String(), {
      defaultAddress: checkSumAddress,
      meta: meta
    });

    console.info(chalk.green(`Successfully set default eth address to ${ethAddress} in metadata db`));
  }

  async updateDefaultEthAddress1(ethAddress: string) {
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

    return await this.dbs.metaData.get(peerID);
  }

  /**
   * @param peerID
   * @returns peerMeta :: { defaultAddress: <addr>, meta: [ { ethaddress, sig }, {..} ] }
   */
  async getPeerEthAddressAndSignature1(peerID: string): Promise<Object> {
    assertValidzId(peerID);

    return await this.publicYDoc.metaData.get(peerID);
  }
}
