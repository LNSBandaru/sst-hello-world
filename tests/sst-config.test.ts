import { beforeEach, describe, expect, it, vi } from "vitest";

const defineConfigMock = vi.fn((config) => config);
const stackInstances: string[] = [];

vi.mock("sst", () => {
  class MockStack {
    stage = "dev";
    region = "ap-southeast-1";
    constructor(public name: string) {
      stackInstances.push(name);
    }
  }

  return {
    defineConfig: defineConfigMock,
    Stack: MockStack,
  };
});

const dataStackCtor = vi.fn();
const storageStackCtor = vi.fn();
const computeStackCtor = vi.fn();
const apiStackCtor = vi.fn();
const edgeStackCtor = vi.fn();
const addOutputMock = vi.fn();

vi.mock("../src/stacks/DataStack", () => ({
  DataStack: vi.fn().mockImplementation((stack: unknown) => {
    const instance = {
      stack,
      tables: { metadata: "metaTable", transactions: "txnTable" },
      metadataTableName: "metaTable",
      transactionsTableName: "txnTable",
    };
    dataStackCtor(stack);
    return instance;
  }),
}));

vi.mock("../src/stacks/StorageStack", () => ({
  StorageStack: vi.fn().mockImplementation((stack: unknown) => {
    const instance = { stack, bucket: "bucketResource" };
    storageStackCtor(stack);
    return instance;
  }),
}));

vi.mock("../src/stacks/ComputeStack", () => ({
  ComputeStack: vi.fn().mockImplementation((stack: unknown, props: unknown) => {
    const instance = {
      stack: { addOutput: addOutputMock },
      hello: { id: "helloFn" },
      countries: { id: "countriesFn" },
      states: { id: "statesFn" },
      helloUrl: "https://hello.local",
    };
    computeStackCtor({ stack, props });
    return instance;
  }),
}));

vi.mock("../src/stacks/ApiStack", () => ({
  ApiStack: vi.fn().mockImplementation((stack: unknown, props: unknown) => {
    const instance = { stack, url: "https://api.local" };
    apiStackCtor({ stack, props });
    return instance;
  }),
}));

vi.mock("../src/stacks/EdgeStack", () => ({
  EdgeStack: vi.fn().mockImplementation((stack: unknown, props: unknown) => {
    const instance = { stack, domain: "https://edge.local" };
    edgeStackCtor({ stack, props });
    return instance;
  }),
}));

describe("sst.config", () => {
  beforeEach(() => {
    process.env.STATES_DB_SECRET = JSON.stringify({
      host: "myrds-host",
      port: 3306,
      username: "1234",
      password: "5432",
      database: "states",
    });
  });

  it("configures app and orchestrates stacks", async () => {
    const configModule = await import("../sst.config");
    const config = configModule.default;

    expect(defineConfigMock).toHaveBeenCalled();
    expect(config.app()).toEqual({
      name: "sst-hello-world",
      region: "ap-southeast-1",
    });

    await config.run();

    expect(stackInstances).toEqual([
      "DataStack",
      "StorageStack",
      "ComputeStack",
      "ApiStack",
      "EdgeStack",
    ]);
    expect(dataStackCtor).toHaveBeenCalledTimes(1);
    expect(storageStackCtor).toHaveBeenCalledTimes(1);
    expect(computeStackCtor).toHaveBeenCalledWith({
      stack: expect.anything(),
      props: {
        tables: { metadata: "metaTable", transactions: "txnTable" },
        bucket: "bucketResource",
        statesDbSecret: {
          type: "secret",
          name: "STATES_DB_SECRET",
          value: JSON.stringify({
            host: "myrds-host",
            port: 3306,
            username: "1234",
            password: "5432",
            database: "states",
          }),
        },
      },
    });
    expect(apiStackCtor).toHaveBeenCalledWith({
      stack: expect.anything(),
      props: {
        hello: { id: "helloFn" },
        countries: { id: "countriesFn" },
        states: { id: "statesFn" },
      },
    });
    expect(edgeStackCtor).toHaveBeenCalledWith({
      stack: expect.anything(),
      props: { apiUrl: "https://api.local" },
    });
    expect(addOutputMock).toHaveBeenCalledWith({
      FunctionUrl: "https://hello.local",
      MetadataTableName: "metaTable",
      TransactionsTableName: "txnTable",
      BucketName: "bucketResource",
    });
  });
});
