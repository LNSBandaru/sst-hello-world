import { aws, Stack } from 'sst';

export class EdgeStack {
    readonly stack: Stack;
    readonly router: aws.Router; // API edge location configuration

    constructor(stack: Stack, props: { apiUrl: string }) {
        this.stack = stack;


        // CloudFront-based router in front of API
        this.router = new aws.Router("EdgeRouter", {
            // domain: "hello-world.com" // it's an optional
        });

        // Route /api/* to the HttpApi (origin = apiUrl)
        this.router.route("/api/{proxy+}", props.apiUrl);

        // Optional: add a static site or S3 origin later
        // this.router.route("/", bucket);
    }

    get domain() {
        return this.router.domainUrl ?? this.router.url;
    }
}