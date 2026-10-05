import { hashToken, isGameId, newGameId, newToken, tokenMatches } from "@server/ids";
import { ipKey, todayJst } from "@server/rate-limit";
import { describe, expect, it } from "vitest";
import { estimateEtaMinutes } from "~/domain/eta";

describe("ipKey (D32)", () => {
  it("keeps IPv4 and folds IPv6 to /64", () => {
    expect(ipKey("203.0.113.5")).toBe("203.0.113.5");
    expect(ipKey("::ffff:203.0.113.5")).toBe("203.0.113.5");
    expect(ipKey("2001:db8:abcd:12:1:2:3:4")).toBe("2001:db8:abcd:12::/64");
    expect(ipKey("2001:db8:abcd:12::99")).toBe("2001:db8:abcd:12::/64");
    expect(ipKey("2001:0db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("uses the Japan date", () => {
    expect(todayJst(new Date("2026-10-05T15:30:00Z"))).toBe("2026-10-06");
  });
});

describe("tokens (ADR 0005)", () => {
  it("matches only the right token", () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(newToken(), hash)).toBe(false);
    expect(tokenMatches("", hash)).toBe(false);
  });

  it("creates valid game ids", () => {
    expect(isGameId(newGameId())).toBe(true);
    expect(isGameId("../etc")).toBe(false);
  });
});

describe("estimateEtaMinutes (D48)", () => {
  it("rounds up and adds boot time", () => {
    expect(
      estimateEtaMinutes({ positionsAhead: 0, ownRemaining: 80, secondsPerPosition: 2, workerRunning: true }),
    ).toBe(3);
    expect(
      estimateEtaMinutes({ positionsAhead: 0, ownRemaining: 25, secondsPerPosition: null, workerRunning: false }),
    ).toBe(1);
    expect(
      estimateEtaMinutes({ positionsAhead: 160, ownRemaining: 80, secondsPerPosition: 2, workerRunning: true }),
    ).toBe(8);
  });
});
