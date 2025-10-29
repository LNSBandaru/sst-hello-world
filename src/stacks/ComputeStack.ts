import { aws, Stack } from 'sst';
import { BaseFunction } from "../components/BaseFunction";
import type { ConfigSecret } from "../config/secrets";
import type { DataTables } from "./DataStack";

type Props = {
    tables: DataTables;
    bucket: aws.Bucket;
    statesDbSecret: ConfigSecret;
};

export class ComputeStack {
    readonly stack: Stack;
    readonly hello: aws.Function;
    readonly countries: aws.Function;
    readonly states: aws.Function;
    readonly myName: aws.Function;

    constructor(stack: Stack, props: Props) {
        this.stack = stack;

        this.hello = new BaseFunction(stack, {
            id: "HelloFn",
            entry: "src/functions/hello/handler.ts",
            env: {
                METADATA_TABLE_NAME: props.tables.metadata,
                TRANSACTIONS_TABLE_NAME: props.tables.transactions,
                BUCKET_NAME: props.bucket.name
            },
            runtime: "nodejs22.x",
            url: false, // behind API Gateway & CloudFront
        }).fn;
        // Principle of Least Privilege grants
        this.hello.attachPermissions([
            props.tables.metadata,
            props.tables.transactions,
            {
                actions: ["s3:PutObject"],
                resources: [props.bucket.arn, `${props.bucket.arn}/*`]
            },
        ]);

        this.countries = new BaseFunction(stack, {
            id: "CountriesFn",
            entry: "src/functions/countries/handler.ts",
            env: {
                COUNTRIES_API_URL: "https://examples.com/contries",
                COUNTRIES_SECRET_NAME: "countries/partner",
            },
            runtime: "nodejs22.x",
            url: false,
        }).fn;
        this.countries.attachPermissions([
            {
                actions: ["secretsmanager:GetSecretValue"],
                resources: ["*"],
            },
        ]);

        this.states = new BaseFunction(stack, {
            id: "StatesFn",
            entry: "src/functions/states/handler.ts",
            runtime: "nodejs22.x",
            url: false,
            bind: [props.statesDbSecret],
        }).fn;

        this.myName = new BaseFunction(stack, {
            id: 'MyName',
            entry: 'src/function/myname/handler.ts'
        })

                this.myName = new BaseFunction(stack, {
            id: 'MyName',
            entry: 'src/function/myname/handler.ts'
        })
    }
    get helloUrl() { return this.hello.url; }
}
