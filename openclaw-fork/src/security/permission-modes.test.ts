/**
 * Unit tests for permission-modes.ts
 */

import { describe, it, expect } from "vitest";
import {
  modeLevel,
  modeAllows,
  modeFromString,
  modeTitle,
  modeDescription,
  getToolRequiredMode,
  checkPermission,
  PermissionPolicy,
  createPermissionLogEntry,
  type PermissionMode,
} from "./permission-modes.js";

describe("PermissionMode", () => {
  describe("modeLevel", () => {
    it("returns correct levels", () => {
      expect(modeLevel("read-only")).toBe(0);
      expect(modeLevel("workspace-write")).toBe(1);
      expect(modeLevel("prompt")).toBe(2);
      expect(modeLevel("danger-full-access")).toBe(3);
      expect(modeLevel("allow")).toBe(4);
    });
  });

  describe("modeAllows", () => {
    it("read-only does not allow workspace-write", () => {
      expect(modeAllows("read-only", "workspace-write")).toBe(false);
    });

    it("workspace-write allows read-only", () => {
      expect(modeAllows("workspace-write", "read-only")).toBe(true);
    });

    it("prompt allows workspace-write", () => {
      expect(modeAllows("prompt", "workspace-write")).toBe(true);
    });

    it("allow allows everything", () => {
      expect(modeAllows("allow", "danger-full-access")).toBe(true);
    });

    it("same mode allows itself", () => {
      expect(modeAllows("prompt", "prompt")).toBe(true);
    });
  });

  describe("modeFromString", () => {
    it("parses valid mode strings", () => {
      expect(modeFromString("read-only")).toBe("read-only");
      expect(modeFromString("prompt")).toBe("prompt");
    });

    it("returns prompt for invalid strings", () => {
      expect(modeFromString("invalid")).toBe("prompt");
      expect(modeFromString("")).toBe("prompt");
    });
  });

  describe("modeTitle", () => {
    it("returns human-readable titles", () => {
      expect(modeTitle("read-only")).toBe("Read Only");
      expect(modeTitle("workspace-write")).toBe("Workspace Write");
      expect(modeTitle("prompt")).toBe("Prompt");
      expect(modeTitle("danger-full-access")).toBe("Full Access");
      expect(modeTitle("allow")).toBe("Allow All");
    });
  });

  describe("modeDescription", () => {
    it("returns descriptions for all modes", () => {
      for (const mode of ["read-only", "workspace-write", "prompt", "danger-full-access", "allow"] as const) {
        expect(modeDescription(mode)).toBeTruthy();
        expect(modeDescription(mode).length).toBeGreaterThan(10);
      }
    });
  });
});

describe("getToolRequiredMode", () => {
  it("read operations require read-only", () => {
    expect(getToolRequiredMode("file_read")).toBe("read-only");
    expect(getToolRequiredMode("grep")).toBe("read-only");
    expect(getToolRequiredMode("glob")).toBe("read-only");
    expect(getToolRequiredMode("web_search")).toBe("read-only");
  });

  it("write operations require workspace-write", () => {
    expect(getToolRequiredMode("file_write")).toBe("workspace-write");
    expect(getToolRequiredMode("file_edit")).toBe("workspace-write");
  });

  it("execution requires prompt", () => {
    expect(getToolRequiredMode("exec")).toBe("prompt");
    expect(getToolRequiredMode("bash")).toBe("prompt");
    expect(getToolRequiredMode("shell")).toBe("prompt");
  });

  it("dangerous operations require full access", () => {
    expect(getToolRequiredMode("delete")).toBe("danger-full-access");
    expect(getToolRequiredMode("fs_delete")).toBe("danger-full-access");
    expect(getToolRequiredMode("sessions_spawn")).toBe("danger-full-access");
  });

  it("unknown tools default to prompt", () => {
    expect(getToolRequiredMode("unknown_tool")).toBe("prompt");
  });

  it("prefix matching works", () => {
    expect(getToolRequiredMode("file_read_something")).toBe("read-only");
    expect(getToolRequiredMode("exec_something")).toBe("prompt");
  });
});

describe("checkPermission", () => {
  it("allow mode permits everything", () => {
    expect(checkPermission("allow", "exec")).toEqual({ outcome: "allow" });
    expect(checkPermission("allow", "delete")).toEqual({ outcome: "allow" });
    expect(checkPermission("allow", "gateway")).toEqual({ outcome: "allow" });
  });

  it("read-only mode denies writes", () => {
    const result = checkPermission("read-only", "file_write");
    expect(result.outcome).toBe("deny");
    if (result.outcome === "deny") {
      expect(result.reason).toContain("Workspace Write");
    }
  });

  it("read-only mode allows reads", () => {
    expect(checkPermission("read-only", "file_read")).toEqual({ outcome: "allow" });
    expect(checkPermission("read-only", "grep")).toEqual({ outcome: "allow" });
  });

  it("prompt mode asks for execution", () => {
    const result = checkPermission("prompt", "exec");
    expect(result.outcome).toBe("prompt");
    if (result.outcome === "prompt") {
      expect(result.message).toContain("Approve");
    }
  });

  it("prompt mode allows reads", () => {
    expect(checkPermission("prompt", "file_read")).toEqual({ outcome: "allow" });
  });

  it("workspace-write allows writes", () => {
    expect(checkPermission("workspace-write", "file_write")).toEqual({ outcome: "allow" });
    expect(checkPermission("workspace-write", "file_edit")).toEqual({ outcome: "allow" });
  });

  it("workspace-write prompts for execution", () => {
    const result = checkPermission("workspace-write", "exec");
    expect(result.outcome).toBe("prompt");
  });

  it("danger-full-access allows everything", () => {
    expect(checkPermission("danger-full-access", "exec")).toEqual({ outcome: "allow" });
    expect(checkPermission("danger-full-access", "delete")).toEqual({ outcome: "allow" });
  });
});

describe("PermissionPolicy", () => {
  it("checks permissions using configured mode", () => {
    const policy = new PermissionPolicy({ mode: "read-only" });
    expect(policy.check("file_read").outcome).toBe("allow");
    expect(policy.check("file_write").outcome).toBe("deny");
  });

  it("respects always-deny list", () => {
    const policy = new PermissionPolicy({
      mode: "allow",
      alwaysDeny: ["gateway"],
    });
    expect(policy.check("gateway").outcome).toBe("deny");
    expect(policy.check("exec").outcome).toBe("allow");
  });

  it("respects always-allow list", () => {
    const policy = new PermissionPolicy({
      mode: "read-only",
      alwaysAllow: ["file_write"],
    });
    expect(policy.check("file_write").outcome).toBe("allow");
    expect(policy.check("exec").outcome).toBe("deny");
  });

  it("respects tool-specific overrides", () => {
    const policy = new PermissionPolicy({
      mode: "read-only",
      toolOverrides: { exec: "prompt" },
    });
    // exec has override to prompt, but read-only < prompt, so should prompt
    const result = policy.check("exec");
    expect(result.outcome).toBe("prompt");
  });

  it("can change mode", () => {
    const policy = new PermissionPolicy({ mode: "read-only" });
    expect(policy.check("file_write").outcome).toBe("deny");
    
    policy.setMode("workspace-write");
    expect(policy.check("file_write").outcome).toBe("allow");
  });
});

describe("createPermissionLogEntry", () => {
  it("creates valid log entry", () => {
    const entry = createPermissionLogEntry(
      "exec",
      "prompt",
      { outcome: "prompt", message: "Approve?" },
      true,
    );
    expect(entry.toolName).toBe("exec");
    expect(entry.mode).toBe("prompt");
    expect(entry.requiredMode).toBe("prompt");
    expect(entry.decision).toBe("prompt");
    expect(entry.approved).toBe(true);
    expect(entry.timestamp).toBeTruthy();
  });
});
