/**
 * Buddy — Terminal/Telegram Companion for CLAWFORGE
 * 
 * A small character that reacts to events.
 * Shows in Telegram as inline messages after agent responses.
 * 
 * States: Happy, Curious, Tired, Excited, Confused, Focused
 * Levels: 1-20, gained through XP
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export type BuddyState = "happy" | "curious" | "tired" | "excited" | "confused" | "focused";

export interface BuddyData {
  name: string;
  level: number;
  xp: number;
  state: BuddyState;
  interactions: number;
  lastInteraction: string;
  enabled: boolean;
}

export interface BuddyReaction {
  emoji: string;
  message: string;
  state: BuddyState;
}

// ============================================================================
// State Reactions
// ============================================================================

const REACTIONS: Record<BuddyState, string[]> = {
  happy: [
    "Nice work!",
    "That went well!",
    "Smooth execution!",
    "Looking good!",
  ],
  curious: [
    "Hmm, interesting...",
    "What are you building?",
    "Tell me more about this.",
  ],
  tired: [
    "You've been at this a while. Maybe stretch?",
    "Consider taking a break.",
    "Long session — don't forget to hydrate!",
  ],
  excited: [
    "That was a big win!",
    "Impressive work!",
    "You're on fire!",
  ],
  confused: [
    "Something went wrong. Want me to help?",
    "Hmm, that didn't work as expected.",
    "Let's figure this out together.",
  ],
  focused: [
    "I see you're deep in it. I'll be quiet.",
    "In the zone. Respecting the flow.",
    "Working hard. I'm here if you need me.",
  ],
};

const STATE_EMOJI: Record<BuddyState, string> = {
  happy: "^_^",
  curious: "o_o",
  tired: "-_-",
  excited: "*_*",
  confused: "?_?",
  focused: ">_>",
};

// ============================================================================
// Buddy Manager
// ============================================================================

export class BuddyManager {
  private data: BuddyData;
  private dataDir: string;
  
  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.data = this.defaultData();
  }
  
  private defaultData(): BuddyData {
    return {
      name: "Buddy",
      level: 1,
      xp: 0,
      state: "happy",
      interactions: 0,
      lastInteraction: new Date().toISOString(),
      enabled: true,
    };
  }
  
  async load(): Promise<void> {
    try {
      const raw = await readFile(join(this.dataDir, "buddy-state.json"), "utf-8");
      this.data = { ...this.defaultData(), ...JSON.parse(raw) };
    } catch {
      // First run — use defaults
    }
  }
  
  async save(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(
      join(this.dataDir, "buddy-state.json"),
      JSON.stringify(this.data, null, 2),
    );
  }
  
  /**
   * React to an event. Returns the reaction message.
   */
  react(event: "success" | "error" | "long_session" | "big_task" | "thinking"): BuddyReaction {
    let state: BuddyState;
    
    switch (event) {
      case "success":
        state = "happy";
        this.addXP(5);
        break;
      case "error":
        state = "confused";
        this.addXP(2);
        break;
      case "long_session":
        state = "tired";
        break;
      case "big_task":
        state = "excited";
        this.addXP(10);
        break;
      case "thinking":
        state = "focused";
        break;
      default:
        state = "curious";
    }
    
    this.data.state = state;
    this.data.interactions++;
    this.data.lastInteraction = new Date().toISOString();
    
    const messages = REACTIONS[state];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const emoji = STATE_EMOJI[state];
    
    return { emoji, message, state };
  }
  
  /**
   * Get current status as a display string.
   */
  getStatus(): string {
    const emoji = STATE_EMOJI[this.data.state];
    return `${emoji} ${this.data.name} | Level ${this.data.level} | ${this.data.xp}/${this.xpForNextLevel()} XP`;
  }
  
  /**
   * Set buddy name.
   */
  setName(name: string): void {
    this.data.name = name;
  }
  
  /**
   * Enable/disable buddy.
   */
  setEnabled(enabled: boolean): void {
    this.data.enabled = enabled;
  }
  
  isEnabled(): boolean {
    return this.data.enabled;
  }
  
  getData(): BuddyData {
    return { ...this.data };
  }
  
  private addXP(amount: number): void {
    this.data.xp += amount;
    const needed = this.xpForNextLevel();
    if (this.data.xp >= needed && this.data.level < 20) {
      this.data.level++;
      this.data.xp -= needed;
    }
  }
  
  private xpForNextLevel(): number {
    return this.data.level * 50;
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createBuddy(dataDir: string): Promise<BuddyManager> {
  const buddy = new BuddyManager(dataDir);
  await buddy.load();
  return buddy;
}
