import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_DATABASE_ID = "bc958420-184a-43ff-b728-069654f58058";
const TEST_DATABASE_ID = "693662d0-6343-4846-8cb3-3391b1f27c89";
const TEST_DATABASE_NAME = "tahouri-license-migration-chain-20261103";
const TEST_WORKER_NAME = "tahouri-license-api-isolated-test";
const TEST_WORKER_ORIGIN = "https://tahouri-license-api-isolated-test.asadtahouri1986.workers.dev";
const APP_ORIGIN = "https://asada100.github.io";

function readConfig(file) {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, file), "utf8"));
}

const production = readConfig("wrangler.jsonc");
const test = readConfig("wrangler.test.jsonc");

const productionDb = production.d1_databases?.find(item => item.binding === "DB");
const testDbs = test.d1_databases || [];
const testDb = testDbs.find(item => item.binding === "DB");

const errors = [];
if (productionDb?.database_id !== PRODUCTION_DATABASE_ID) {
  errors.push("Production config does not point to the expected production D1; investigate manually.");
}
if (test.name !== TEST_WORKER_NAME) errors.push("Unexpected test Worker name.");
if (test.vars?.SERVICE_ENVIRONMENT !== "test") errors.push("Test environment marker is missing.");
if (test.vars?.APP_ORIGIN !== APP_ORIGIN) errors.push("GitHub Pages app origin is not allowed in test CORS config.");
if (test.vars?.ADMIN_ORIGIN !== TEST_WORKER_ORIGIN) errors.push("Admin origin is not pinned to the isolated test Worker.");
if (testDb?.database_id !== TEST_DATABASE_ID) errors.push("Test DB ID is not the isolated test database.");
if (testDb?.database_name !== TEST_DATABASE_NAME) errors.push("Test DB name is incorrect.");
if (testDbs.length !== 1 || testDb?.binding !== "DB") errors.push("Test config must contain exactly one DB binding.");
if (testDb?.database_id === PRODUCTION_DATABASE_ID) errors.push("BLOCKED: test config points to Production D1.");
if (testDb?.remote !== true) errors.push("Test D1 binding must use remote:true.");
if (test.workers_dev !== true) errors.push("Only the isolated test Worker must expose its workers.dev endpoint.");
if (test.preview_urls !== false) errors.push("Test Worker preview URLs must remain disabled.");
if (test.routes?.length || test.route || test.custom_domains?.length) {
  errors.push("Test config must not define public routes or custom domains.");
}
if (testDb?.migrations_dir !== productionDb?.migrations_dir) {
  errors.push("Test and production configs must use the same reviewed migrations directory.");
}

if (errors.length) {
  console.error("Tahouri isolated-test configuration check FAILED:");
  for (const message of errors) console.error("- " + message);
  process.exit(1);
}

console.log("Tahouri isolated-test configuration: PASS");
console.log("Production D1 ID is excluded from the test config.");
console.log("GitHub Pages CORS origin is allowed.");
console.log("Only the isolated test Worker workers.dev endpoint is enabled.");
console.log("Preview URLs, custom domains, and routes remain disabled.");
