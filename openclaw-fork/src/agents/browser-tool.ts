/**
 * Browser Tool for CLAWFORGE
 * 
 * Integrates Gbrowser (gstack browse engine) into the agent tool system.
 * Uses accessibility tree for page reading — not vision models.
 * 
 * Commands:
 * - navigate(url): Open URL
 * - snapshot(): Get page content as structured text with @refs
 * - click(ref): Click element by ref
 * - fill(ref, text): Fill input field
 * - screenshot(): Take screenshot
 * - text(): Get cleaned page text
 */

// ============================================================================
// Types
// ============================================================================

export interface BrowserToolConfig {
  /** Server URL */
  serverUrl: string;
  /** Auth token */
  token: string;
}

export interface BrowserResult {
  success: boolean;
  output: string;
  error?: string;
}

// ============================================================================
// Browser Tool
// ============================================================================

export class BrowserTool {
  private config: BrowserToolConfig;

  constructor(config: BrowserToolConfig) {
    this.config = config;
  }

  private async sendCommand(command: string, args: string[] = []): Promise<string> {
    const response = await fetch(`${this.config.serverUrl}/command`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command, args }),
    });
    return response.text();
  }

  /**
   * Navigate to a URL.
   */
  async navigate(url: string): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("goto", [url]);
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Get page snapshot (accessibility tree with @refs).
   */
  async snapshot(flags: string[] = []): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("snapshot", flags);
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Click element by ref.
   */
  async click(ref: string): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("click", [ref]);
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Fill input field.
   */
  async fill(ref: string, text: string): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("fill", [ref, text]);
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Get cleaned page text.
   */
  async text(): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("text");
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Take screenshot.
   */
  async screenshot(filename?: string): Promise<BrowserResult> {
    try {
      const args = filename ? [filename] : [];
      const output = await this.sendCommand("screenshot", args);
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }

  /**
   * Get current URL.
   */
  async url(): Promise<BrowserResult> {
    try {
      const output = await this.sendCommand("url");
      return { success: true, output };
    } catch (e) {
      return { success: false, output: "", error: String(e) };
    }
  }
}

// ============================================================================
// Tool Definition for Agent Integration
// ============================================================================

export const BROWSER_TOOL_DEFINITION = {
  name: "browser",
  description: "Navigate and interact with web pages. Uses accessibility tree for reading — no vision model needed.",
  searchHint: "browse web, navigate URL, click elements",
  parameters: {
    action: "navigate | snapshot | click | fill | text | screenshot | url",
    url: "(navigate only) URL to navigate to",
    ref: "(click/fill only) Element ref like @e3",
    text: "(fill only) Text to fill",
  },
};
