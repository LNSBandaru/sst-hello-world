import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiHandlerWrapper = vi.fn((fn) => fn);
const eventHandlerWrapper = vi.fn((_event, handler) => handler);

vi.mock("sst/node/api", () => ({
  ApiHandler: (fn: any) => apiHandlerWrapper(fn),
}));

vi.mock("sst/node/event-bus", () => ({
  EventHandler: (event: unknown, handler: any) =>
    eventHandlerWrapper(event, handler),
}));

const todoCreateMock = vi.fn();
const todoListMock = vi.fn(() => [{ id: "1", title: "Todo #1" }]);
const todoEvents = {
  Created: Symbol("TodoCreated"),
};

vi.mock("@sst-hello-world/core/todo", () => ({
  Todo: {
    create: todoCreateMock,
    list: todoListMock,
    Events: todoEvents,
  },
}));

const executeMock = vi.fn();
const endMock = vi.fn();
const createConnectionMock = vi.fn(() =>
  Promise.resolve({
    execute: executeMock,
    end: endMock,
  }),
);

vi.mock("mysql2/promise", () => ({
  default: { createConnection: createConnectionMock },
  createConnection: createConnectionMock,
}));

describe("function handlers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.STATES_DB_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates todo via API handler", async () => {
    const { create } = await import("../packages/functions/src/todo");

    const result = await create({});

    expect(apiHandlerWrapper).toHaveBeenCalled();
    expect(todoCreateMock).toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 200,
      body: "Todo created",
    });
  });

  it("lists todos via API handler", async () => {
    const payload = [
      { id: "abc", title: "Todo #0" },
      { id: "def", title: "Todo #1" },
    ];
    todoListMock.mockReturnValueOnce(payload);

    const { list } = await import("../packages/functions/src/todo");
    const result = await list({});

    expect(todoListMock).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(payload));
  });

  it("returns greeting from lambda handler", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-12-18T10:00:00.000Z"));

    const { handler } = await import("../packages/functions/src/lambda");
    const response = await handler({});

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("2024-12-18T10:00:00.000Z");
  });

  it("subscribes to todo created event", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { handler } = await import(
      "../packages/functions/src/events/todo-created"
    );

    expect(eventHandlerWrapper).toHaveBeenCalledWith(
      todoEvents.Created,
      expect.any(Function),
    );

    await handler({ detail: { id: "123" } });
    expect(logSpy).toHaveBeenCalledWith("Todo created", { detail: { id: "123" } });
    logSpy.mockRestore();
  });

  it("retrieves active states from database", async () => {
    process.env.STATES_DB_SECRET = JSON.stringify({
      host: "myrds-host",
      port: 3306,
      username: "1234",
      password: "5432",
      database: "states",
    });

    executeMock.mockResolvedValueOnce([[{ id: 1, name: "Alabama" }], undefined]);

    const { handler } = await import("../src/functions/states/handler");
    const response = await handler({});

    expect(createConnectionMock).toHaveBeenCalledWith({
      host: "myrds-host",
      port: 3306,
      user: "1234",
      password: "5432",
      database: "states",
    });
    expect(executeMock).toHaveBeenCalledWith(
      "SELECT * FROM States WHERE status = ?",
      [1],
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe(JSON.stringify([{ id: 1, name: "Alabama" }]));
    expect(endMock).toHaveBeenCalled();
  });

  it("returns 500 when database call fails", async () => {
    process.env.STATES_DB_SECRET = JSON.stringify({
      host: "myrds-host",
      username: "1234",
      password: "5432",
    });

    executeMock.mockRejectedValueOnce(new Error("connection failed"));

    const { handler } = await import("../src/functions/states/handler");
    const response = await handler({});

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toContain(
      "Failed to fetch active states.",
    );
  });
});
