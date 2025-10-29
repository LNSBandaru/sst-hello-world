import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const { COUNTRIES_API_URL, COUNTRIES_SECRET_NAME } = process.env;

const secretsClient = new SecretsManagerClient({});

type CountryCredentials = {
  username: string;
  password: string;
};

let cachedCredentials: CountryCredentials | undefined;

const ensureUrl = () => {
  if (!COUNTRIES_API_URL) {
    throw new Error("Countries API URL is not configured.");
  }

  return COUNTRIES_API_URL;
};

const ensureSecretName = () => {
  if (!COUNTRIES_SECRET_NAME) {
    throw new Error("Countries API secret name is not configured.");
  }

  return COUNTRIES_SECRET_NAME;
};

const loadCredentials = async (): Promise<CountryCredentials> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const secretId = ensureSecretName();
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId }),
  );

  const secretString =
    response.SecretString ??
    (response.SecretBinary
      ? Buffer.from(response.SecretBinary).toString("utf-8")
      : undefined);

  if (!secretString) {
    throw new Error("Countries API secret has no payload.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(secretString);
  } catch {
    throw new Error("Countries API secret must be valid JSON.");
  }

  const credentials = parsed as Partial<CountryCredentials>;
  if (!credentials?.username || !credentials?.password) {
    throw new Error(
      "Countries API secret must include 'username' and 'password' fields.",
    );
  }

  cachedCredentials = {
    username: credentials.username,
    password: credentials.password,
  };

  return cachedCredentials;
};

const buildAuthHeader = async () => {
  const { username, password } = await loadCredentials();
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return `Basic ${token}`;
};

export const handler: APIGatewayProxyHandlerV2 = async () => {
  try {
    const response = await fetch(ensureUrl(), {
      headers: {
        Authorization: await buildAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Failed to fetch countries from partner API.",
          status: response.status,
        }),
      };
    }

    const payload = await response.json();
    const countries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.countries)
        ? payload.countries
        : payload;

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(countries),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Unexpected error retrieving countries.",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
