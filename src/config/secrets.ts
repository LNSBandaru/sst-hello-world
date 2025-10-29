export type ConfigSecret = {
  type: "secret";
  name: string;
  value: string;
};

export const createConfigSecret = (name: string, value: string): ConfigSecret => ({
  type: "secret",
  name,
  value,
});
