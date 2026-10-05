import { describe, expect, it } from "vitest";
import { classifyDrop } from "~/domain/classification";
import { evalLevel, formatScore } from "~/domain/eval-label";
import { scoreToCp, winningChances } from "~/domain/winning-chances";

describe("winningChances", () => {
  it("is 0 at an equal position and symmetric", () => {
    expect(winningChances({ type: "cp", value: 0 })).toBe(0);
    expect(winningChances({ type: "cp", value: 300 })).toBeCloseTo(-winningChances({ type: "cp", value: -300 }));
  });

  it("treats mate as ±1000cp (D50)", () => {
    expect(scoreToCp({ type: "mate", value: 3 })).toBe(1000);
    expect(scoreToCp({ type: "mate", value: -2 })).toBe(-1000);
    expect(scoreToCp({ type: "mate", value: 0 })).toBe(-1000);
    expect(scoreToCp({ type: "cp", value: 5000 })).toBe(1000);
  });
});

describe("classifyDrop (D27: 0.1 / 0.2 / 0.3 on the −1..1 scale)", () => {
  it.each([
    [0.05, null],
    [0.1, "inaccuracy"],
    [0.19, "inaccuracy"],
    [0.2, "mistake"],
    [0.3, "blunder"],
    [1.5, "blunder"],
  ])("%s → %s", (drop, expected) => {
    expect(classifyDrop(drop)).toBe(expected);
  });
});

describe("eval label (D9)", () => {
  it("maps to five levels", () => {
    expect(evalLevel({ type: "cp", value: 0 })).toBe("equal");
    expect(evalLevel({ type: "cp", value: 80 })).toBe("better");
    expect(evalLevel({ type: "cp", value: 400 })).toBe("winning");
    expect(evalLevel({ type: "cp", value: -80 })).toBe("worse");
    expect(evalLevel({ type: "mate", value: -1 })).toBe("losing");
  });

  it("formats numbers", () => {
    expect(formatScore({ type: "cp", value: 180 })).toBe("+1.8");
    expect(formatScore({ type: "cp", value: -240 })).toBe("−2.4");
    expect(formatScore({ type: "mate", value: 3 })).toBe("M3");
    expect(formatScore({ type: "mate", value: -2 })).toBe("-M2");
  });
});
