import { aws, Stack } from 'sst';

export class ApiStack {
    readonly stack: Stack;
    readonly api: aws.ApiGatewayV2;

    constructor(stack: Stack, props: { hello: aws.Function; countries: aws.Function; states: aws.Function }) {
        this.stack = stack;
        this.api = new aws.ApiGatewayV2("HttpApi", {});

        // Map routes to Lambda
        this.api.route('GET /hello', props.hello);
        this.api.route('GET /contries', props.countries);
        this.api.route('GET /states', props.states);
    }

    get url() { return this.api.url }
}
