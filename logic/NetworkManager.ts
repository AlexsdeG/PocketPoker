import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { NetMessage } from '../types';

export class NetworkManager {
  private static instance: NetworkManager;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  
  // Callbacks
  public onData: ((data: NetMessage, senderId: string) => void) | null = null;
  public onPeerConnect: ((peerId: string) => void) | null = null;
  public onPeerDisconnect: ((peerId: string) => void) | null = null;
  public onOpen: ((id: string) => void) | null = null;

  private constructor() {}

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  // Force a new ID generation by destroying old peer
  public reset() {
      this.close();
      this.peer = null;
      this.connections.clear();
      // Reset callbacks
      this.onData = null;
      this.onPeerConnect = null;
      this.onPeerDisconnect = null;
      this.onOpen = null;
  }

  public init(id?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // If we already have a peer and an ID was requested that matches, reuse it?
        // No, for this specific request "generate each new game a new link", we prefer to overwrite if not explicitly keeping.
        if (this.peer && !this.peer.destroyed) {
            if (id && this.peer.id === id) {
                 resolve(this.peer.id);
                 return;
            }
            // If existing peer but we want new one (or new ID), destroy old
            this.peer.destroy();
        }

        try {
            // Create Peer instance. If id is undefined, PeerJS generates a random UUID.
            this.peer = id ? new Peer(id) : new Peer();
        } catch (error) {
            console.error('[P2P] Failed to initialize Peer:', error);
            reject(error);
            return;
        }

        this.peer.on('open', (peerId: string) => {
            console.log('[P2P] My ID:', peerId);
            if (this.onOpen) this.onOpen(peerId);
            resolve(peerId);
        });

        this.peer.on('connection', (conn: DataConnection) => {
            console.log('[P2P] Incoming connection:', conn.peer);
            this.handleConnection(conn);
        });

        this.peer.on('error', (err: any) => {
            console.error('[P2P] Error:', err);
            // Don't reject if it's just a non-fatal error, but mostly init fails on fatal
            // reject(err); 
        });
        
        this.peer.on('disconnected', () => {
             console.log('[P2P] Disconnected from signaling server');
             // Optionally reconnect?
        });
        
        this.peer.on('close', () => {
            console.log('[P2P] Peer destroyed');
        });
    });
  }

  public connectTo(hostId: string): void {
      if (!this.peer || this.peer.destroyed) return;
      console.log('[P2P] Connecting to host:', hostId);
      const conn = this.peer.connect(hostId);
      this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
      conn.on('open', () => {
          console.log('[P2P] Connection opened:', conn.peer);
          this.connections.set(conn.peer, conn);
          if (this.onPeerConnect) this.onPeerConnect(conn.peer);
      });

      conn.on('data', (data: any) => {
          if (this.onData) this.onData(data as NetMessage, conn.peer);
      });

      conn.on('close', () => {
          console.log('[P2P] Connection closed:', conn.peer);
          this.connections.delete(conn.peer);
          if (this.onPeerDisconnect) this.onPeerDisconnect(conn.peer);
      });

      conn.on('error', (err) => {
          console.error('[P2P] Connection error:', err);
          this.connections.delete(conn.peer);
          if (this.onPeerDisconnect) this.onPeerDisconnect(conn.peer);
      });
  }

  public send(targetId: string, message: NetMessage) {
      const conn = this.connections.get(targetId);
      if (conn && conn.open) {
          conn.send(message);
      } else {
          console.warn(`[P2P] Cannot send to ${targetId}, connection not open.`);
      }
  }

  public broadcast(message: NetMessage) {
      this.connections.forEach(conn => {
          if (conn.open) conn.send(message);
      });
  }

  public close() {
      if (this.peer) {
          // Close all connections first
          this.connections.forEach(conn => conn.close());
          this.connections.clear();
          
          this.peer.destroy();
          this.peer = null;
      }
  }
}