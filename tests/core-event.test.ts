import { describe, expect, it, vi } from "vitest";

const createEventBuilderMock = vi.fn(() => "event-builder");
const validatorSymbol = Symbol("validator");

vi.mock("sst/node/event-bus", () => ({
  createEventBuilder: createEventBuilderMock,
  ZodValidator: validatorSymbol,
}));

describe("core event", () => {
  it("exports event builder configured with bus and validator", async () => {
    const module = await import("../packages/core/src/event");

    expect(createEventBuilderMock).toHaveBeenCalledWith({
      bus: "bus",
      validator: validatorSymbol,
    });
    expect(module.event).toBe("event-builder");
  });
});
