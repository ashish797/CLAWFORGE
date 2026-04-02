/**
 * UDS (Unix Domain Socket) Session Communication for CLAWFORGE
 * 
 * Sessions talk to each other over Unix domain sockets.
 * Fast, local communication between agents without HTTP overhead.
 * 
 * Inspired by Claude Code's UDS Inbox feature.
 */

import { createServer, createConnection, type Socket } from "net";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export interface UDSMessage {
  /** Source session */
  from: string;
  /** Target session */
  to: string;
  /** Message content */
  content: string;
  /** Message type */
  type: "request" | "response" | "notification";
  /** Correlation ID for request/response matching */
  correlationId?: string;
  /** Timestamp */
  timestamp: string;
}

export type MessageHandler = (message: UDSMessage) => void;

// ============================================================================
// UDS Session Node
// ============================================================================

export class UDSSessionNode {
  private sessionId: string;
  private socketPath: string;
  private server: ReturnType<typeof createServer> | null = null;
  private handler: MessageHandler | null = null;
  private connections: Map<string, Socket> = new Map();

  constructor(sessionId: string, baseDir: string = "/tmp/clawforge-uds") {
    this.sessionId = sessionId;
    this.socketPath = join(baseDir, `${sessionId}.sock`);
  }

  /**
   * Start listening for messages.
   */
  async start(): Promise<void> {
    // Clean up old socket
    if (existsSync(this.socketPath)) {
      unlinkSync(this.socketPath);
    }

    return new Promise((resolve, reject) => {
      this.server = createServer((socket) => {
        let buffer = "";
        socket.on("data", (data) => {
          buffer += data.toString();
          try {
            const message: UDSMessage = JSON.parse(buffer);
            buffer = "";
            if (this.handler) {
              this.handler(message);
            }
          } catch {
            // Incomplete JSON, wait for more data
          }
        });
      });

      this.server.on("error", reject);
      this.server.listen(this.socketPath, () => {
        resolve();
      });
    });
  }

  /**
   * Send a message to another session.
   */
  async send(message: UDSMessage): Promise<void> {
    const targetPath = join(
      this.socketPath.substring(0, this.socketPath.lastIndexOf("/")),
      `${message.to}.sock`
    );

    return new Promise((resolve, reject) => {
      const socket = createConnection(targetPath, () => {
        socket.write(JSON.stringify(message));
        socket.end();
        resolve();
      });
      socket.on("error", reject);
    });
  }

  /**
   * Register message handler.
   */
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  /**
   * Get session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get socket path.
   */
  getSocketPath(): string {
    return this.socketPath;
  }

  /**
   * Stop listening.
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      if (existsSync(this.socketPath)) {
        unlinkSync(this.socketPath);
      }
    }
  }
}

// ============================================================================
// Session Registry (find sessions by name)
// ============================================================================

export class UDSSessionRegistry {
  private sessions: Map<string, UDSSessionNode> = new Map();

  /**
   * Register a session node.
   */
  register(node: UDSSessionNode): void {
    this.sessions.set(node.getSessionId(), node);
  }

  /**
   * Get a session node by ID.
   */
  get(sessionId: string): UDSSessionNode | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * List all registered sessions.
   */
  list(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Remove a session.
   */
  async remove(sessionId: string): Promise<boolean> {
    const node = this.sessions.get(sessionId);
    if (!node) return false;
    await node.stop();
    this.sessions.delete(sessionId);
    return true;
  }
}
