import {Libp2p as ILibp2p} from "libp2p";
import { Bootstrap } from '@libp2p/bootstrap'
import PeerId from "peer-id";
import { ZStore } from "./storage.js";

/**
 * Class to handle Peer Discovery by libp2p node
 * + Bootstrap nodes
 */
export class PeerDiscovery {
  private node: ILibp2p | undefined;

  constructor (node?: ILibp2p) {
    this.node = node;
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

    // enable bootstrap in node.modules
    // this.node._modules.peerDiscovery = this.node._modules.peerDiscovery ?? [];
    // if (this.node._modules.peerDiscovery.find(p => p instanceof Bootstrap) === undefined) {
    //   this.node._modules.peerDiscovery.push(Bootstrap);
    // }

    // // add multiaddrs to list
    // const origList = (this.node._config.peerDiscovery[Bootstrap.tag] as any)?.list ?? [];
    // this.node._config.peerDiscovery[Bootstrap.tag] = {
    //   list: [...origList, ...list]
    // };
  }

  /**
   * On Connect handler.
   * @param handler callback after connection is established
   */
  onConnect (handler: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    this.node.connectionManager.addEventListener('peer:connect', handler);
  }

  /**
   * On Disconnect handler.
   * @param handler callback after connection is established
   */
  onDisconnect (handler: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    this.node.connectionManager.addEventListener('peer:disconnect', handler);
  }

  /**
   * On Discover handler.
   * @param handler callback after new peer is discovered
   */
  onDiscover (handler: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    this.node.addEventListener('peer:discovery', handler);
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
