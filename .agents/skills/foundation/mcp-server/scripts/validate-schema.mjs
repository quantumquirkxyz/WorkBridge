#!/usr/bin/env node
// validate-schema.mjs — Minimal JSON Schema validator for MCP artifacts
// Usage: node validate-schema.mjs <artifact.json> <schema.json>

import fs from 'node:fs/promises';

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const out = {};
  let active = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      out[active] = key[2] === '' || key[2] === '[]' ? [] : key[2].replace(/^["']|["']$/g, '');
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active) {
      if (!Array.isArray(out[active])) out[active] = [];
      out[active].push(item[1].replace(/^["']|["']$/g, ''));
    }
  }
  return out;
}

function validateSchema(instance, schema) {
  const errors = [];

  function checkType(value, expectedType, path) {
    const actual = typeof value;
    if (expectedType === 'object' && Array.isArray(value)) {
      return;
    }
    if (actual !== expectedType) {
      errors.push(`Type mismatch at ${path}: expected ${expectedType}, got ${actual}`);
    }
  }

  function validate(value, sch, path) {
    if (!sch) return;
    if (sch.type) checkType(value, sch.type, path);
    if (sch.enum && !sch.enum.includes(value)) {
      errors.push(`Value "${value}" at ${path} not in enum ${JSON.stringify(sch.enum)}`);
    }
    if (sch.const !== undefined && value !== sch.const) {
      errors.push(`Value "${value}" at ${path} does not match const ${JSON.stringify(sch.const)}`);
    }
    if (sch.required && typeof value === 'object' && !Array.isArray(value)) {
      for (const key of sch.required) {
        if (!(key in value)) {
          errors.push(`Missing required key "${key}" at ${path}`);
        }
      }
    }
    if (sch.properties && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, subSch] of Object.entries(sch.properties)) {
        if (key in value) validate(value[key], subSch, `${path}.${key}`);
      }
    }
    if (sch.items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        validate(value[i], sch.items, `${path}[${i}]`);
      }
    }
  }

  validate(instance, schema, '$');
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  const artifactPath = args[0];
  const schemaPath = args[1];

  if (!artifactPath || !schemaPath) {
    console.error('Usage: node validate-schema.mjs <artifact.json> <schema.json>');
    process.exit(1);
  }

  try {
    const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
    const errors = validateSchema(artifact, schema);

    if (errors.length === 0) {
      console.log('Validation passed');
      process.exit(0);
    } else {
      console.error('Validation failed:');
      for (const err of errors) console.error(`  - ${err}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
