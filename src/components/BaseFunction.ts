// It's a reuseble components
import { aws, Stack } from 'sst';
import type { ConfigSecret } from "../config/secrets";

export type BaseFunctionProps = {
     id: string; // Name of a function
     entry: string; // path to handler file
     env?: Record<string, string>;
     memory?: `${number} MB`;
     timeout?: `${number} seconds`;
     runtime?: "nodejs22.x";
     url?: boolean; //enable FunctionURL
     bind?: (ConfigSecret | unknown)[];
}

/**
 * Reusable enterprise-grade wrapper for sst.aws.Function
 * Applies secure defaults + observable config across Lambdas.
 */
export class BaseFunction {
    readonly fn: aws.Function;

    constructor(stack: Stack, props: BaseFunctionProps) {
        const environment = {
            STAGE: stack.stage,
            REGION: stack.region,
            ...(props.env ?? {}),
        } as Record<string, string>;

        const links = props.bind ?? [];

        for (const item of links) {
            if (typeof item === "object" && item && "type" in item && (item as ConfigSecret).type === "secret") {
                const secret = item as ConfigSecret;
                environment[secret.name] = secret.value;
            }
        }

        this.fn = new aws.Function(props.id, {
            handler: props.entry,
            url: props.url ?? true,
            runtime: props.runtime ?? "nodejs22.x",
            memory: props.memory ?? "128 MB",
            timeout: props.timeout ?? "10 seconds",
            environment,
            // Enterprise defaults: least-privilige policy baselin
            permissions: [],
            logs: {
                retention: "one-month",
                // Note: integrate with centralized log pipeline )ex: AWL -> S3/Authena
            },
            // Versioning for safe rollbacks 
            link: props.bind ?? [],
        });
    }

    // ** Function URL for quick testing. */
    get url() {
        return this.fn.url;
    }
}
