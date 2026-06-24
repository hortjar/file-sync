/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
  input: "http://localhost:3001/openapi/json",
  output: {
    path: "src/generated",
    clean: true,
  },
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@hey-api/client-fetch",
    {
      name: "@tanstack/react-query",
      mutationOptions: true,
      queryOptions: true,
    },
  ],
};
