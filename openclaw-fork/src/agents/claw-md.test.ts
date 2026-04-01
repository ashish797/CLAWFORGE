/**
 * Unit tests for claw-md.ts
 */

import { describe, it, expect } from "vitest";
import { parseClawMd, renderClawMdPrompt } from "./claw-md.js";

describe("parseClawMd", () => {
  it("parses Instructions section", () => {
    const content = `# My Project

## Instructions
- Use TypeScript strict mode
- Always write tests
`;
    const result = parseClawMd(content);
    expect(result.found).toBe(true);
    expect(result.instructions).toContain("Use TypeScript strict mode");
    expect(result.instructions).toContain("Always write tests");
  });

  it("parses Rules section", () => {
    const content = `## Rules
- Never modify production
- Always run lint before committing
`;
    const result = parseClawMd(content);
    expect(result.rules).toContain("Never modify production");
    expect(result.rules).toContain("Always run lint before committing");
  });

  it("parses Context section", () => {
    const content = `## Context
- This is a REST API for e-commerce
- Database: PostgreSQL
`;
    const result = parseClawMd(content);
    expect(result.context).toContain("This is a REST API for e-commerce");
    expect(result.context).toContain("Database: PostgreSQL");
  });

  it("parses custom sections into other", () => {
    const content = `## Tech Stack
- React
- Node.js
`;
    const result = parseClawMd(content);
    expect(result.other["Tech Stack"]).toContain("React");
    expect(result.other["Tech Stack"]).toContain("Node.js");
  });

  it("handles empty content", () => {
    const result = parseClawMd("");
    expect(result.found).toBe(true);
    expect(result.instructions).toEqual([]);
    expect(result.rules).toEqual([]);
  });

  it("ignores non-bullet lines", () => {
    const content = `## Instructions
This is a description, not a bullet point.
- This is a bullet point
Another description.
- Another bullet point
`;
    const result = parseClawMd(content);
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions).toContain("This is a bullet point");
    expect(result.instructions).toContain("Another bullet point");
  });

  it("handles * bullet points", () => {
    const content = `## Instructions
* Use TypeScript
- Write tests
`;
    const result = parseClawMd(content);
    expect(result.instructions).toContain("Use TypeScript");
    expect(result.instructions).toContain("Write tests");
  });
});

describe("renderClawMdPrompt", () => {
  it("returns empty string when not found", () => {
    const result = renderClawMdPrompt({
      raw: "",
      instructions: [],
      rules: [],
      context: [],
      other: {},
      found: false,
    });
    expect(result).toBe("");
  });

  it("renders instructions section", () => {
    const result = renderClawMdPrompt({
      raw: "",
      instructions: ["Use TypeScript", "Write tests"],
      rules: [],
      context: [],
      other: {},
      found: true,
    });
    expect(result).toContain("## Project Instructions");
    expect(result).toContain("Use TypeScript");
    expect(result).toContain("Write tests");
  });

  it("renders all sections", () => {
    const result = renderClawMdPrompt({
      raw: "",
      instructions: ["Be fast"],
      rules: ["Never break prod"],
      context: ["REST API"],
      other: { "Tech Stack": ["React", "Node"] },
      found: true,
    });
    expect(result).toContain("## Project Instructions");
    expect(result).toContain("## Project Rules");
    expect(result).toContain("## Project Context");
    expect(result).toContain("## Tech Stack");
  });
});
