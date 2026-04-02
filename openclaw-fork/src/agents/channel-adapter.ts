/**
 * Channel Adapter Interface for CLAWFORGE
 * 
 * Makes CLAWFORGE work across any messaging channel.
 * Intelligence layer is channel-agnostic.
 * UX layer is channel-specific.
 * 
 * Implement this interface for each channel:
 * - Telegram
 * - Discord
 * - Terminal
 * - Web
 */

// ============================================================================
// Types
// ============================================================================

export interface InlineButton {
  text: string;
  callbackData: string;
}

export interface MessageOptions {
  /** Parse as markdown */
  markdown?: boolean;
  /** Reply to a specific message */
  replyTo?: string;
  /** Inline buttons */
  buttons?: InlineButton[][];
  /** Media attachment URL or path */
  media?: string;
  /** Media type */
  mediaType?: "image" | "file" | "audio" | "video";
}

export interface ButtonCallback {
  callbackData: string;
  userId: string;
  messageId: string;
}

// ============================================================================
// Channel Adapter Interface
// ============================================================================

export interface ChannelAdapter {
  /** Channel name (telegram, discord, terminal, web) */
  readonly name: string;

  /** Send a text message */
  sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<void>;

  /** Send an image */
  sendImage(chatId: string, imagePath: string, caption?: string): Promise<void>;

  /** Send inline buttons */
  sendButtons(chatId: string, text: string, buttons: InlineButton[][]): Promise<void>;

  /** Edit a sent message */
  editMessage(chatId: string, messageId: string, newText: string, options?: MessageOptions): Promise<void>;

  /** Delete a message */
  deleteMessage(chatId: string, messageId: string): Promise<void>;

  /** Register message handler */
  onMessage(handler: (chatId: string, text: string, userId: string) => void): void;

  /** Register button callback handler */
  onButtonCallback(handler: (callback: ButtonCallback) => void): void;

  /** Start listening */
  start(): Promise<void>;

  /** Stop listening */
  stop(): Promise<void>;
}

// ============================================================================
// Telegram Adapter (placeholder — wire to OpenClaw's existing Telegram)
// ============================================================================

export class TelegramAdapter implements ChannelAdapter {
  readonly name = "telegram";
  private messageHandler?: (chatId: string, text: string, userId: string) => void;
  private buttonHandler?: (callback: ButtonCallback) => void;

  async sendMessage(chatId: string, text: string, options?: MessageOptions): Promise<void> {
    // Wire to OpenClaw's existing Telegram integration
    console.log(`[Telegram] → ${chatId}: ${text.slice(0, 100)}...`);
  }

  async sendImage(chatId: string, imagePath: string, caption?: string): Promise<void> {
    console.log(`[Telegram] → ${chatId}: [Image: ${imagePath}] ${caption || ""}`);
  }

  async sendButtons(chatId: string, text: string, buttons: InlineButton[][]): Promise<void> {
    const btnStr = buttons.map(row => row.map(b => `[${b.text}]`).join(" ")).join("\n");
    console.log(`[Telegram] → ${chatId}: ${text}\n${btnStr}`);
  }

  async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {
    console.log(`[Telegram] Edit ${messageId}: ${newText.slice(0, 50)}...`);
  }

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    console.log(`[Telegram] Delete ${messageId}`);
  }

  onMessage(handler: (chatId: string, text: string, userId: string) => void): void {
    this.messageHandler = handler;
  }

  onButtonCallback(handler: (callback: ButtonCallback) => void): void {
    this.buttonHandler = handler;
  }

  async start(): Promise<void> {
    console.log("[Telegram] Adapter started");
  }

  async stop(): Promise<void> {
    console.log("[Telegram] Adapter stopped");
  }
}

// ============================================================================
// Discord Adapter (placeholder)
// ============================================================================

export class DiscordAdapter implements ChannelAdapter {
  readonly name = "discord";

  async sendMessage(chatId: string, text: string): Promise<void> {
    console.log(`[Discord] → ${chatId}: ${text.slice(0, 100)}...`);
  }
  async sendImage(chatId: string, imagePath: string, caption?: string): Promise<void> {}
  async sendButtons(chatId: string, text: string, buttons: InlineButton[][]): Promise<void> {}
  async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {}
  async deleteMessage(chatId: string, messageId: string): Promise<void> {}
  onMessage(): void {}
  onButtonCallback(): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}

// ============================================================================
// Terminal Adapter (placeholder)
// ============================================================================

export class TerminalAdapter implements ChannelAdapter {
  readonly name = "terminal";

  async sendMessage(chatId: string, text: string): Promise<void> {
    console.log(text);
  }
  async sendImage(chatId: string, imagePath: string, caption?: string): Promise<void> {
    console.log(`[Image: ${imagePath}]`);
  }
  async sendButtons(chatId: string, text: string, buttons: InlineButton[][]): Promise<void> {
    console.log(text);
    buttons.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.map(b => b.text).join(" | ")}`);
    });
  }
  async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {}
  async deleteMessage(chatId: string, messageId: string): Promise<void> {}
  onMessage(): void {}
  onButtonCallback(): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}

// ============================================================================
// Channel Manager
// ============================================================================

export class ChannelManager {
  private adapters: Map<string, ChannelAdapter> = new Map();

  register(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(channelName: string): ChannelAdapter | null {
    return this.adapters.get(channelName) || null;
  }

  async startAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.start();
    }
  }

  async stopAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.stop();
    }
  }

  getRegisteredChannels(): string[] {
    return Array.from(this.adapters.keys());
  }
}
