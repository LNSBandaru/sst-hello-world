import { describe, expect, it, vi } from "vitest";

describe("hello handler", () => {
  it("returns greeting with timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    const { handler } = await import("../src/functions/hello/handler");
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.headers).toStrictEqual({ "content-type": "application/json" });
    const body = JSON.parse(result.body);
    expect(body.message).toBe("Hello World");
    expect(body.timestamp).toBe("2025-01-01T00:00:00.000Z");

    vi.useRealTimers();
  });
});
