import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-secrets-manager", () => {
  class SecretsManagerClient {
    send = sendMock;
  }

  class GetSecretValueCommand {
    input;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    SecretsManagerClient,
    GetSecretValueCommand,
  };
});

const { fetch: originalFetch } = globalThis;

const setEnv = (overrides: Record<string, string | undefined>) => {
  Object.assign(process.env, overrides);
};

const clearEnv = (...keys: string[]) => {
  for (const key of keys) {
    delete process.env[key];
  }
};

describe("countries handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    setEnv({
      COUNTRIES_API_URL: "https://partner.test/countries",
      COUNTRIES_SECRET_NAME: "countries/partner",
    });
  });

  afterEach(() => {
    clearEnv("COUNTRIES_API_URL", "COUNTRIES_SECRET_NAME");
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns countries when partner API succeeds", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "abcd", password: "efh" }),
    });

    const responsePayload = [{ code: "US" }, { code: "IN" }];
    (globalThis.fetch as unknown as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responsePayload),
    });

    const { handler } = await import("../src/functions/countries/handler");

    const result = await handler();
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(responsePayload));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const fetchArgs = (globalThis.fetch as vi.Mock).mock.calls[0];
    expect(fetchArgs[0]).toBe("https://partner.test/countries");
    expect(fetchArgs[1]?.headers?.Authorization).toBe(
      `Basic ${Buffer.from("abcd:efh").toString("base64")}`,
    );
  });

  it("reuses cached credentials on subsequent calls", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "user", password: "pass" }),
    });

    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ code: "FR" }]),
    });

    const { handler } = await import("../src/functions/countries/handler");

    await handler();
    await handler();

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to secret binary content", async () => {
    sendMock.mockResolvedValueOnce({
      SecretBinary: Buffer.from(JSON.stringify({ username: "bin", password: "ary" })),
    });

    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ countries: ["UK"] }),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(["UK"]));
  });

  it("returns upstream status when partner API fails", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "abcd", password: "efh" }),
    });

    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(503);
    expect(JSON.parse(result.body).message).toContain("Failed to fetch countries");
  });

  it("returns 500 when secret payload is invalid JSON", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: "invalid-json",
    });

    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain("Unexpected error retrieving countries");
  });

  it("returns 500 when secret payload is empty", async () => {
    sendMock.mockResolvedValueOnce({});

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain("Unexpected error");
  });

  it("returns 500 when secret lacks credentials", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "only-user" }),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain("Unexpected error");
  });

  it("returns object payload unchanged when partner sends object", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "obj", password: "return" }),
    });

    const payload = { value: 42 };
    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify(payload));
  });

  it("returns 500 when environment variables are missing", async () => {
    clearEnv("COUNTRIES_SECRET_NAME");
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "x", password: "y" }),
    });

    (globalThis.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain("Unexpected error");
  });

  it("returns 500 when API url is missing", async () => {
    clearEnv("COUNTRIES_API_URL");
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "user", password: "pass" }),
    });

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toContain("Unexpected error");
  });

  it("returns 500 when fetch rejects", async () => {
    sendMock.mockResolvedValueOnce({
      SecretString: JSON.stringify({ username: "err", password: "or" }),
    });

    (globalThis.fetch as vi.Mock).mockRejectedValue(new Error("network error"));

    const { handler } = await import("../src/functions/countries/handler");
    const result = await handler();

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("network error");
  });
});
