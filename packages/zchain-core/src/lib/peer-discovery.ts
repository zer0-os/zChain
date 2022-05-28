import {Libp2p as ILibp2p} from "libp2p";
import { Bootstrap } from '@libp2p/bootstrap'
import { ZStore } from "./storage.js";
import type { PeerId } from '@libp2p/interfaces/peer-id'

/**
 * Class to handle Peer Discovery by libp2p node
 * + Bootstrap nodes
 */
export class PeerDiscovery {
  private node: ILibp2p | undefined;
  zStore: ZStore;

  constructor (zStore: ZStore, node?: ILibp2p) {
    this.node = node;
    this.zStore = zStore;
  }

  /**
   * Asserts Zchain node is initialized
   * @returns Libp2p node
   */
  private _assertNodeInitialized (): ILibp2p {
    if (this.node === undefined) {
      throw new Error("ZCHAIN node is not initialized");
    }
    return this.node;
  }

  /**
   * Adds a list of multiaddresses to bootstrap config
   * @param list list of multiaddr to add
   */
  addBootstrapNodes (list: string[]): void {
    this.node = this._assertNodeInitialized();

    // // enable bootstrap in node.modules
    // this.node.peerDiscovery = this.node.peerDiscovery ?? [];
    // if (this.node.peerDiscovery.find(p => p instanceof Bootstrap) === undefined) {
    //   this.node.peerDiscovery.push(Bootstrap);
    // }

    // // add multiaddrs to list
    // const origList = (this.node.peerDiscovery[Bootstrap.tag] as any)?.list ?? [];
    // this.node.peerDiscovery[Bootstrap.tag] = {
    //   list: [...origList, ...list]
    // };
  }

  /**
   * On Connect handler.
   * @param handler callback after connection is established
   */
  onConnect (handler: (connection) => void): void {
    this.node = this._assertNodeInitialized();
    (this.node as any).connectionManager.on('peer:connect', handler);
  }

  /**
   * On Discover handler.
   * @param handler callback after new peer is discovered
   */
  onDiscover (handler: (peerId: PeerId) => void): void {
    this.node = this._assertNodeInitialized();

    (this.node as any).on('peer:discovery', async (peerId: PeerId) => {
      // handler passed by user
      handler(peerId);
    });
  }

  /**
   * Handle listen protocol for libp2p node
   * @param protocol protocol string (eg. /chat/1.0)
   * @param handler handler function
   */
  handleProtocol(protocol: string, handler: (props) => void) {
    this.node.handle(protocol, handler);
  }
}


  // /**
  //  * On Connect handler.
  //  * @param handler callback after connection is established
  //  */
  // onConnect (handler: (event: CustomEvent<any>) => void): void {
  //   this.node = this._assertNodeInitialized();
  //   //this.node.connectionManager.addEventListener('peer:connect', handler);
  // }

  // /**
  //  * On Discover handler.
  //  * @param handler callback after new peer is discovered
  //  */
  // onDiscover (handler: (event: CustomEvent<any>) => void): void {
  //   console.log("N ", this.node);

  //   this.node = this._assertNodeInitialized();
  //   this.node.addEventListener('peer:discovery', handler);
  // }


  //   // todo: review and remove
  // // update: i think for sandbox we can use this logic
  // private async _initModules() {
  //   this.zChain.peerDiscovery.onConnect(async (event) => {
  //     const connection = event.detail;

  //     const [_, __, displayStr] = this.getNameAndPeerID(connection.remotePeer.toB58String())
  //     console.log('Connection established to:', displayStr);
  //   });

  //   this.zChain.peerDiscovery.onDiscover((event) => {
  //     const peerInfo = event.detail;

  //     const [_, __, displayStr] = this.getNameAndPeerID(peerInfo.toB58String())
  //     console.log('Discovered:', displayStr);
  //   });
  // }