
export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const states = await fetchStates();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(states),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Failed to fetch active states.",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
