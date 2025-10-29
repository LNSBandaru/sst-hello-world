const config = await (async () => {
  const { defineConfig, Stack } = await import("sst");
  const { createConfigSecret } = await import("./src/config/secrets");

  const defaultStatesSecret = createConfigSecret(
    "STATES_DB_SECRET",
    process.env.STATES_DB_SECRET ??
      JSON.stringify({
        host: "myrds-host",
        port: 3306,
        username: "1234",
        password: "5432",
        database: "states",
      }),
  );

  return defineConfig({
    // defined the provide
    app() {
      return {
        name: "sst-hello-world",
        region: "ap-southeast-1",
      };
    },
    async run() {
      const { DataStack } = await import("./src/stacks/DataStack");
      const { StorageStack } = await import("./src/stacks/StorageStack");
      const { ComputeStack } = await import("./src/stacks/ComputeStack");
      const { ApiStack } = await import("./src/stacks/ApiStack");
      const { EdgeStack } = await import("./src/stacks/EdgeStack");

      const data = new DataStack(new Stack("DataStack"));
      const storage = new StorageStack(new Stack("StorageStack"));

      const compute = new ComputeStack(new Stack("ComputeStack"), {
        tables: data.tables,
        bucket: storage.bucket,
        statesDbSecret: defaultStatesSecret,
      });

      const api = new ApiStack(new Stack("ApiStack"), {
        hello: compute.hello,
        countries: compute.countries,
        states: compute.states,
      });

      new EdgeStack(new Stack("EdgeStack"), { apiUrl: api.url });

      compute.stack.addOutput({
        FunctionUrl: compute.helloUrl,
        MetadataTableName: data.metadataTableName,
        TransactionsTableName: data.transactionsTableName,
        BucketName: storage.bucket,
      });
    },
  });
})();

export default config;
