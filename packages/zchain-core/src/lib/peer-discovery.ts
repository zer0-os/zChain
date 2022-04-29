import Libp2p from "libp2p";
import Bootstrap from 'libp2p-bootstrap';
import PeerId from "peer-id";
import { ZStore } from "./storage";

/**
 * Class to handle Peer Discovery by libp2p node
 * + Bootstrap nodes
 */
export class PeerDiscovery {
  private node: Libp2p | undefined;
  zStore: ZStore;

  constructor (zStore: ZStore, node?: Libp2p) {
    this.node = node;
    this.zStore = zStore;
  }

  /**
   * Asserts Zchain node is initialized
   * @returns Libp2p node
   */
  private _assertNodeInitialized (): Libp2p {
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
    this.node._modules.peerDiscovery = this.node._modules.peerDiscovery ?? [];
    if (this.node._modules.peerDiscovery.find(p => p instanceof Bootstrap) === undefined) {
      this.node._modules.peerDiscovery.push(Bootstrap);
    }

    // add multiaddrs to list
    const origList = (this.node._config.peerDiscovery[Bootstrap.tag] as any)?.list ?? [];
    this.node._config.peerDiscovery[Bootstrap.tag] = {
      list: [...origList, ...list]
    };
  }

  /**
   * On Connect handler.
   * @param handler callback after connection is established
   */
  onConnect (handler: (connection: Libp2p.Connection) => void): void {
    this.node = this._assertNodeInitialized();
    this.node.connectionManager.on('peer:connect', handler);
  }

  /**
   * On Discover handler.
   * @param handler callback after new peer is discovered
   */
  onDiscover (handler: (peerId: PeerId) => void): void {
    this.node = this._assertNodeInitialized();

    this.node.on('peer:discovery', async (peerId: PeerId) => {
      // handler passed by user
      handler(peerId);
    });
  }

  /**
   * Handle listen protocol for libp2p node
   * @param protocol protocol string (eg. /chat/1.0)
   * @param handler handler function
   */
  handleProtocol(protocol: string, handler: (props: Libp2p.HandlerProps) => void) {
    this.node.handle(protocol, handler);
  }
}
