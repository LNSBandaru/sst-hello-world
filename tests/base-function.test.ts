import { beforeEach, describe, expect, it, vi } from "vitest";

type FunctionInstance = {
  id: string;
  config: Record<string, unknown>;
  environment: Record<string, string>;
  permissions?: unknown[];
};

const functionInstances: FunctionInstance[] = [];

vi.mock("sst", () => {
  class MockFunction {
    id: string;
    config: Record<string, unknown>;
    environment: Record<string, string>;
    url: boolean;

    constructor(id: string, config: any) {
      this.id = id;
      this.config = config;
      this.environment = config.environment;
      this.url = config.url ?? true;
      functionInstances.push({
        id,
        config,
        environment: config.environment,
      });
    }

    attachPermissions(perms: unknown[]) {
      // expose for assertions if needed
      const instance = functionInstances.find((item) => item.id === this.id);
      if (instance) {
        instance.permissions = perms;
      }
    }
  }

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

  return {
    aws: {
      Function: MockFunction,
    },
    Stack: MockStack,
  };
});

describe("BaseFunction component", () => {
  beforeEach(() => {
    functionInstances.length = 0;
    vi.resetModules();
  });

  it("applies defaults and merges environment variables", async () => {
    const { BaseFunction } = await import("../src/components/BaseFunction");
    const stack = { stage: "prod", region: "ap-southeast-1" } as any;

    const baseFn = new BaseFunction(stack, {
      id: "ExampleFn",
      entry: "src/functions/example.ts",
      env: { CUSTOM: "VALUE" },
    });

    expect(functionInstances).toHaveLength(1);
    const instance = functionInstances[0];
    expect(instance.id).toBe("ExampleFn");
    expect(instance.config.handler).toBe("src/functions/example.ts");
    expect(instance.config.memory).toBe("128 MB");
    expect(instance.config.timeout).toBe("10 seconds");
    expect(instance.environment).toMatchObject({
      STAGE: "prod",
      REGION: "ap-southeast-1",
      CUSTOM: "VALUE",
    });
    expect(baseFn.url).toBe(true);
  });

  it("respects explicit overrides", async () => {
    const { BaseFunction } = await import("../src/components/BaseFunction");
    const stack = { stage: "dev", region: "us-west-2" } as any;

    const baseFn = new BaseFunction(stack, {
      id: "OverrideFn",
      entry: "handler.ts",
      memory: "256 MB",
      timeout: "20 seconds",
      runtime: "nodejs22.x",
      url: false,
      bind: [
        {
          type: "secret",
          name: "DB_SECRET",
          value: "super-secret",
        },
      ],
    });

    const instance = functionInstances.find((item) => item.id === "OverrideFn");
    expect(instance?.config.memory).toBe("256 MB");
    expect(instance?.config.timeout).toBe("20 seconds");
    expect(instance?.config.runtime).toBe("nodejs22.x");
    expect(instance?.config.link).toEqual([
      {
        type: "secret",
        name: "DB_SECRET",
        value: "super-secret",
      },
    ]);
    expect(instance?.environment).toMatchObject({
      DB_SECRET: "super-secret",
      STAGE: "dev",
      REGION: "us-west-2",
    });
    expect(baseFn.url).toBe(false);
  });
});
