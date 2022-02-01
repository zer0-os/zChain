import Libp2p from "libp2p";
import Bootstrap from 'libp2p-bootstrap';

/**
 * Class to handle Peer Discovery by libp2p node
 * + Bootstrap nodes
 */
export class PeerDiscovery {
  private node: Libp2p | undefined;

  constructor(node?: Libp2p) {
      this.node = node;
  }

  /**
   * Asserts Zchain node is initialized
   * @returns Libp2p node
   */
  private _assertNodeInitialized(): Libp2p {
    if (this.node === undefined) {
      throw new Error("ZCHAIN node is not initialized");
    }
    return this.node;
  }

  /**
   * Adds a list of multiaddresses to bootstrap config
   * @param list list of multiaddr to add
   */
  addBootstrapNodes(list: string[]) {
    this.node = this._assertNodeInitialized();

    // enable bootstrap in node.modules
    this.node._modules.peerDiscovery = this.node._modules.peerDiscovery ?? [];
    if(this.node._modules.peerDiscovery.find(p => p instanceof Bootstrap) === undefined) {
      this.node._modules.peerDiscovery.push(Bootstrap);
    }

    // add multiaddrs to list
    const origList = (this.node._config.peerDiscovery[Bootstrap.tag] as any)?.["list"] ?? [];
    this.node._config.peerDiscovery[Bootstrap.tag] = {
      list: [ ...origList, ...list ]
    }
  }

  /**
   * On Connect handler. Logs newly established connection's peerID
   */
  onConnect() {
    this.node = this._assertNodeInitialized();
    this.node.connectionManager.on('peer:connect', (connection) => {
      console.log('Connection established to:', connection.remotePeer.toB58String())	// Emitted when a peer has been found
    })
  }

  /**
   * On Discover handler. Logs newly discovered connection's peerID
   */
  onDiscover() {
    this.node = this._assertNodeInitialized();
    this.node.on('peer:discovery', (peerId) => {
      // No need to dial, autoDial is on
      console.log('Discovered:', peerId.toB58String())
    })
  }
}