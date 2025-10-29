import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import mysql from "mysql2/promise";

type DbCredentials = {
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
};

const parseCredentials = (): DbCredentials => {
  const secret = process.env.STATES_DB_SECRET;

  if (!secret) {
    throw new Error("STATES_DB_SECRET is not configured.");
  }

  const parsed: DbCredentials = JSON.parse(secret);
  return parsed;
};

const fetchStates = async () => {
  const { host, port = 3306, username, password, database = "states" } =
    parseCredentials();

  const connection = await mysql.createConnection({
    host,
    port,
    user: username,
    password,
    database,
  });

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM States WHERE status = ?",
      [1],
    );
    return rows;
  } finally {
    await connection.end();
  }
};

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
