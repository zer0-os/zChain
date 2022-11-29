import {Libp2p as ILibp2p} from "libp2p";
import PeerId from "peer-id";

/**
 * Class to handle/emit Peer Discovery & connections by libp2p node
 */
export class PeerManager {
  private node: ILibp2p;

  constructor (node: ILibp2p) {
    this.node = node;
  }

  /**
   * Asserts node is initialized
   * @returns Libp2p node
   */
  private _assertNodeInitialized (): ILibp2p {
    if (this.node === undefined) {
      throw new Error("node is not initialized");
    }
    return this.node;
  }


  /**
   * On Connect handler.
   * @param handler callback after connection is established
   */
  onConnect (handler?: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    const defaultHandler = async (event) => {
      const connection = event.detail;
      console.log('Connection established to:', connection.remotePeer.toString());
    };

    this.node.connectionManager.addEventListener('peer:connect', handler ?? defaultHandler);
  }

  /**
   * On Disconnect handler.
   * @param handler callback after connection is established
   */
  onDisconnect (handler?: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    const defaultHandler = async (event) => {
      const connection = event.detail;
      console.log('Disconnected from peer:', connection.remotePeer.toString());
    };

    this.node.connectionManager.addEventListener('peer:disconnect', handler ?? defaultHandler);
  }

  /**
   * On Discover handler.
   * @param handler callback after new peer is discovered
   */
  onDiscover (handler?: (event: CustomEvent<any>) => void): void {
    this.node = this._assertNodeInitialized();
    const set = new Set();
    const defaultHandler = async (event) => {
      const peerId = event.detail.id.toString();
      if (!set.has(peerId)) {
        console.log('Discovered peer:', peerId);
        set.add(peerId);
      }
    };
    
    this.node.addEventListener('peer:discovery', handler ?? defaultHandler);
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
