import { aws, Stack } from 'sst';

export class StorageStack {
    readonly stack: Stack;
    readonly bucket: aws.Bucket;

    constructor(stack: Stack) {
        this.stack = stack;
        this.bucket = new aws.Bucket("my-lakshmi-transactions", {
            versioned: true,
            lifecycleRules: [{ id: "logs-retention", expiration: "365 days" }],
            blockPublicACLs: true,
            blockPublicPolicy: true,
            enforceSSL: true,
        })
    }

    get transactionBucketName() {
        return this.bucket.name;
    }
}