// Validates a /metadata response against the JSON Schema copied from skope-api.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(
  readFileSync(
    resolve(HERE, "../contracts/metadata-1.0.0.schema.json"),
    "utf8",
  ),
);

// The API's schema bounds tuples with min/maxItems instead of `items: false`,
// which Ajv's strict mode would otherwise log about.
const validate = new Ajv2020({ allErrors: true, strictTuples: false }).compile(
  schema,
);

/** Returns a list of readable errors; empty when the response is valid. */
export function metadataErrors(response) {
  if (validate(response)) return [];
  return validate.errors.map(
    (error) => `${error.instancePath || "/"} ${error.message}`,
  );
}

// Usage: npm run check:metadata -- <metadata URL>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: npm run check:metadata -- <metadata URL>");
    process.exit(2);
  }
  const response = await fetch(url);
  const errors = metadataErrors(await response.json());
  if (errors.length > 0) {
    console.error(`${url} does not match the schema:\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log(`${url} matches the /metadata 1.0.0 schema.`);
}
