import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

export const handler: APIGatewayProxyHandlerV2 = async () => {
    const body = {
        message: "Hello World",
        stage: process.env.STAGE,
        region: process.env.REGION,
        app: process.env.APP_NAME,
        timestamp: new Date().toISOString(),
    }

    return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    }
}