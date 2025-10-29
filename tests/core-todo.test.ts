import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const publishMock = vi.fn();
const eventBuilderMock = vi.fn(() => ({ publish: publishMock }));

vi.mock("../packages/core/src/event", () => ({
  event: eventBuilderMock,
}));

describe("core todo module", () => {
  beforeEach(() => {
    vi.resetModules();
    publishMock.mockClear();
    eventBuilderMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates todo and publishes created event", async () => {
    const randomValues = ["uuid-1"];
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => randomValues.shift()!);

    const { create, Events } = await import("../packages/core/src/todo");

    await create();

    expect(eventBuilderMock).toHaveBeenCalledWith(
      "todo.created",
      expect.anything(),
    );
    expect(publishMock).toHaveBeenCalledWith({ id: "uuid-1" });
    expect(typeof Events.Created.publish).toBe("function");
  });

  it("lists 50 todos with deterministic data", async () => {
    const uuids = Array.from({ length: 50 }, (_v, index) => `uuid-${index}`);
    vi.spyOn(crypto, "randomUUID").mockImplementation(() => uuids.shift()!);

    const { list } = await import("../packages/core/src/todo");

    const todos = list();
    expect(todos).toHaveLength(50);
    expect(todos[0]).toEqual({ id: "uuid-0", title: "Todo #0" });
    expect(todos[49]).toEqual({ id: "uuid-49", title: "Todo #49" });
  });
});
