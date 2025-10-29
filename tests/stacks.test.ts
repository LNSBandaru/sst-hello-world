import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigSecret } from "../src/config/secrets";

type FunctionRecord = {
  id: string;
  config: any;
  environment: Record<string, string>;
  permissions?: unknown[];
  instance: any;
};

type TableRecord = {
  id: string;
  config: any;
  instance: any;
};

type BucketRecord = {
  id: string;
  config: any;
  instance: any;
};

type ApiRecord = {
  id: string;
  config: any;
  routes: Record<string, unknown>;
  instance: any;
};

type RouterRecord = {
  id: string;
  routes: { pattern: string; target: unknown }[];
  instance: any;
};

const functionRecords: FunctionRecord[] = [];
const tableRecords: TableRecord[] = [];
const bucketRecords: BucketRecord[] = [];
const apiRecords: ApiRecord[] = [];
const routerRecords: RouterRecord[] = [];

vi.mock("sst", () => {
  class MockStack {
    stage: string;
    region: string;
    constructor(
      readonly name: string,
      props: { stage?: string; region?: string } = {},
    ) {
      this.stage = props.stage ?? "dev";
      this.region = props.region ?? "ap-southeast-1";
    }
  }

  class MockFunction {
    id: string;
    config: any;
    environment: Record<string, string>;
    url: boolean;
    permissions?: unknown[];

    constructor(id: string, config: any) {
      this.id = id;
      this.config = config;
      this.environment = config.environment;
      this.url = config.url ?? true;
      this.permissions = [];
      const record: FunctionRecord = {
        id,
        config,
        environment: this.environment,
        permissions: this.permissions,
        instance: this,
      };
      functionRecords.push(record);
    }

    attachPermissions(perms: unknown[]) {
      this.permissions = perms;
      const record = functionRecords.find((item) => item.instance === this);
      if (record) {
        record.permissions = perms;
      }
    }
  }

  class MockDynamoDBTable {
    id: string;
    config: any;
    name: string;
    constructor(id: string, config: any) {
      this.id = id;
      this.config = config;
      this.name = id;
      tableRecords.push({ id, config, instance: this });
    }
  }

  class MockBucket {
    id: string;
    config: any;
    name: string;
    constructor(id: string, config: any) {
      this.id = id;
      this.config = config;
      this.name = id;
      bucketRecords.push({ id, config, instance: this });
    }
  }

  class MockApiGatewayV2 {
    id: string;
    config: any;
    routes: Record<string, unknown> = {};
    url = "https://api.example.com";

    constructor(id: string, config: any) {
      this.id = id;
      this.config = config;
      apiRecords.push({ id, config, routes: this.routes, instance: this });
    }

    route(pattern: string, handler: unknown) {
      this.routes[pattern] = handler;
    }
  }

  class MockRouter {
    id: string;
    routes: { pattern: string; target: unknown }[] = [];
    url = "https://router.example.com";
    domainUrl?: string;

    constructor(id: string) {
      this.id = id;
      routerRecords.push({ id, routes: this.routes, instance: this });
    }

    route(pattern: string, target: unknown) {
      this.routes.push({ pattern, target });
    }
  }

  return {
    Stack: MockStack,
    aws: {
      Function: MockFunction,
      DynamoDBTable: MockDynamoDBTable,
      Bucket: MockBucket,
      ApiGatewayV2: MockApiGatewayV2,
      Router: MockRouter,
    },
  };
});

describe("Stack constructs", () => {
  beforeEach(() => {
    vi.resetModules();
    functionRecords.length = 0;
    tableRecords.length = 0;
    bucketRecords.length = 0;
    apiRecords.length = 0;
    routerRecords.length = 0;
  });

  it("DataStack provisions metadata and transactions tables", async () => {
    const { DataStack } = await import("../src/stacks/DataStack");
    const { Stack } = await import("sst");

    const stack = new Stack("TestStack");
    const dataStack = new DataStack(stack);

    expect(tableRecords.map((record) => record.id).sort()).toEqual([
      "metadata",
      "transactions",
    ]);

    const metadataConfig = tableRecords.find((t) => t.id === "metadata")!.config;
    expect(metadataConfig.fields).toEqual({ Id: "number", mobile: "string" });

    expect(dataStack.metadataTableName).toBe("metadata");
    expect(dataStack.transactionsTableName).toBe("transactions");
  });

  it("StorageStack provisions secure bucket", async () => {
    const { StorageStack } = await import("../src/stacks/StorageStack");
    const { Stack } = await import("sst");

    const stack = new Stack("StorageStack");
    const storageStack = new StorageStack(stack);

    expect(bucketRecords).toHaveLength(1);
    const bucketConfig = bucketRecords[0].config;
    expect(bucketConfig.versioned).toBe(true);
    expect(storageStack.transactionBucketName).toBe("my-lakshmi-transactions");
  });

  it("ApiStack wires routes to provided lambdas", async () => {
    const { ApiStack } = await import("../src/stacks/ApiStack");
    const { Stack } = await import("sst");

    const stack = new Stack("ApiStack");
    const helloFn = { name: "hello" } as any;
    const countriesFn = { name: "countries" } as any;
    const statesFn = { name: "states" } as any;

    const apiStack = new ApiStack(stack, {
      hello: helloFn,
      countries: countriesFn,
      states: statesFn,
    });

    expect(apiRecords).toHaveLength(1);
    const routes = apiRecords[0].routes;
    expect(routes["GET /hello"]).toBe(helloFn);
    expect(routes["GET /contries"]).toBe(countriesFn);
    expect(routes["GET /states"]).toBe(statesFn);
    expect(apiStack.url).toBe("https://api.example.com");
  });

  it("EdgeStack routes API traffic to HttpApi", async () => {
    const { EdgeStack } = await import("../src/stacks/EdgeStack");
    const { Stack } = await import("sst");

    const stack = new Stack("EdgeStack");
    const edge = new EdgeStack(stack, { apiUrl: "https://api.example.com" });

    expect(routerRecords).toHaveLength(1);
    const routes = routerRecords[0].routes;
    expect(routes).toContainEqual({
      pattern: "/api/{proxy+}",
      target: "https://api.example.com",
    });
    expect(edge.domain).toBe("https://router.example.com");
  });

  it("ComputeStack configures hello, countries, and states functions", async () => {
    const { ComputeStack } = await import("../src/stacks/ComputeStack");
    const { Stack } = await import("sst");

    const stack = new Stack("Compute", { stage: "prod", region: "ap-southeast-1" });
    const dataTables = {
      metadata: { name: "metadataTable", arn: "arn:meta" },
      transactions: { name: "transactionsTable", arn: "arn:txn" },
    } as any;
    const bucket = { name: "bucketName", arn: "arn:bucket" } as any;
    const secretValue = JSON.stringify({
      host: "myrds-host",
      port: 3306,
      username: "1234",
      password: "5432",
      database: "states",
    });
    const statesSecret = createConfigSecret("STATES_DB_SECRET", secretValue);

    const compute = new ComputeStack(stack, {
      tables: dataTables,
      bucket,
      statesDbSecret: statesSecret,
    });

    expect(functionRecords.map((record) => record.id).sort()).toEqual([
      "CountriesFn",
      "HelloFn",
      "StatesFn",
    ]);

    const hello = functionRecords.find((record) => record.id === "HelloFn")!;
    expect(hello.environment.METADATA_TABLE_NAME).toBe(dataTables.metadata);
    expect(hello.environment.TRANSACTIONS_TABLE_NAME).toBe(
      dataTables.transactions,
    );
    expect(hello.environment.BUCKET_NAME).toBe("bucketName");
    expect(compute.helloUrl).toBe(false);

    const countries = functionRecords.find((record) => record.id === "CountriesFn")!;
    expect(countries.environment).toMatchObject({
      COUNTRIES_API_URL: "https://examples.com/contries",
      COUNTRIES_SECRET_NAME: "countries/partner",
    });
    expect(countries.permissions).toEqual([
      {
        actions: ["secretsmanager:GetSecretValue"],
        resources: ["*"],
      },
    ]);

    const states = functionRecords.find((record) => record.id === "StatesFn")!;
    expect(states.environment.STATES_DB_SECRET).toBe(secretValue);
  });
});
