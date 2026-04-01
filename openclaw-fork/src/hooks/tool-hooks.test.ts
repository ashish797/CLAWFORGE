/**
 * Unit tests for tool-hooks.ts
 */

import { describe, it, expect } from "vitest";
import {
  ToolHookRunner,
  createToolHookRunner,
  type ToolHookConfig,
} from "./tool-hooks.js";

describe("ToolHookRunner", () => {
  describe("with no hooks configured", () => {
    it("allows everything by default", async () => {
      const runner = createToolHookRunner();
      
      const preResult = await runner.runPreToolUse("exec", '{"command":"ls"}');
      expect(preResult.outcome).toBe("allow");
      expect(preResult.messages).toEqual([]);
      
      const postResult = await runner.runPostToolUse("exec", '{"command":"ls"}', "output", false);
      expect(postResult.outcome).toBe("allow");
    });
  });

  describe("PreToolUse hooks", () => {
    it("allows when hook exits with code 0", async () => {
      const runner = createToolHookRunner({
        preToolUse: ["echo 'pre ok'"],
      });
      
      const result = await runner.runPreToolUse("exec", '{"command":"ls"}');
      expect(result.outcome).toBe("allow");
      expect(result.messages).toContain("pre ok");
    });

    it("denies when hook exits with code 2", async () => {
      const runner = createToolHookRunner({
        preToolUse: ["echo 'blocked'; exit 2"],
      });
      
      const result = await runner.runPreToolUse("exec", '{"command":"rm -rf /"}');
      expect(result.outcome).toBe("deny");
      if (result.outcome === "deny") {
        expect(result.reason).toContain("blocked");
      }
    });

    it("warns but allows for other exit codes", async () => {
      const runner = createToolHookRunner({
        preToolUse: ["echo 'warning'; exit 1"],
      });
      
      // With non-0, non-2 exit: should still allow (warn is handled at higher level)
      const result = await runner.runPreToolUse("exec", '{"command":"ls"}');
      // Note: The current implementation returns the first non-0 result
      // which for exit 1 would be a warn, not deny
      expect(result.outcome).not.toBe("deny");
    });
  });

  describe("PostToolUse hooks", () => {
    it("allows when hook exits with code 0", async () => {
      const runner = createToolHookRunner({
        postToolUse: ["echo 'post ok'"],
      });
      
      const result = await runner.runPostToolUse("exec", '{"command":"ls"}', "output", false);
      expect(result.outcome).toBe("allow");
      expect(result.messages).toContain("post ok");
    });

    it("denies when hook exits with code 2", async () => {
      const runner = createToolHookRunner({
        postToolUse: ["echo 'post denied'; exit 2"],
      });
      
      const result = await runner.runPostToolUse("exec", '{"command":"ls"}', "output", false);
      expect(result.outcome).toBe("deny");
    });
  });

  describe("multiple hooks", () => {
    it("runs all hooks and collects messages", async () => {
      const runner = createToolHookRunner({
        preToolUse: ["echo 'hook 1'", "echo 'hook 2'"],
      });
      
      const result = await runner.runPreToolUse("exec", '{"command":"ls"}');
      expect(result.outcome).toBe("allow");
      expect(result.messages).toContain("hook 1");
      expect(result.messages).toContain("hook 2");
    });

    it("stops at first deny", async () => {
      const runner = createToolHookRunner({
        preToolUse: ["echo 'hook 1'", "echo 'blocked'; exit 2", "echo 'hook 3'"],
      });
      
      const result = await runner.runPreToolUse("exec", '{"command":"ls"}');
      expect(result.outcome).toBe("deny");
      // hook 3 should not have run
      expect(result.messages).not.toContain("hook 3");
    });
  });
});

describe("createToolHookRunner", () => {
  it("creates runner with empty config by default", () => {
    const runner = createToolHookRunner();
    expect(runner).toBeInstanceOf(ToolHookRunner);
  });

  it("creates runner with partial config", () => {
    const runner = createToolHookRunner({
      preToolUse: ["echo test"],
    });
    expect(runner).toBeInstanceOf(ToolHookRunner);
  });
});
