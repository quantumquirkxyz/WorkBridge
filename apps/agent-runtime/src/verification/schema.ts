import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "credential-verification.schema.json",
);

const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as object;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

export function validateCredentialVerification(value: unknown): string[] {
  if (validate(value)) return [];
  return (validate.errors ?? []).map(
    (error: { instancePath?: string; message?: string }) =>
      `${error.instancePath || "/"} ${error.message ?? "invalid"}`,
  );
}
