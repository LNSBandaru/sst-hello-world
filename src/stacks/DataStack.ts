import { aws, Stack } from 'sst';

export type DataTables = {
    metadata: aws.DynamoDBTable;
    transactions: aws.DynamoDBTable;
};

export class DataStack {
    readonly stack: Stack;
    readonly tables: DataTables;

    constructor(stack: Stack) {
        this.stack = stack;

        const metadataTable = new aws.DynamoDBTable("metadata", {
            fields: {
                Id: "number",
                mobile: "string",
            },
            primaryIndex: {
                hashKey: "Id",
                rangeKey: "mobile",
            },
            billingMode: "pay_per_request",
            pointInTimeRecovery: true,
        });

        const transactionsTable = new aws.DynamoDBTable("transactions", {
            fields: {
                mobile: "string",
                crated_on: "string",
            },
            primaryIndex: {
                hashKey: "mobile",
                rangeKey: "crated_on",
            },
            billingMode: "pay_per_request",
            pointInTimeRecovery: true,
        });

        this.tables = {
            metadata: metadataTable,
            transactions: transactionsTable,
        };
    }

    get metadataTable() {
        return this.tables.metadata;
    }

    get transactionsTable() {
        return this.tables.transactions;
    }

    get metadataTableName() {
        return this.metadataTable.name;
    }

    get transactionsTableName() {
        return this.transactionsTable.name;
    }
}
