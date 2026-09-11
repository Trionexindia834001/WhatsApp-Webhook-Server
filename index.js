import("./artifacts/api-server/dist/index.mjs").catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exit(1);
});