import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const action = process.argv[2];
const composeFile = "apps/certo/docker-compose.yml";

if (!existsSync(composeFile)) {
  console.error(
    [
      "Certo clone missing.",
      "From Agent-Hackathon run:",
      "git clone https://github.com/Schroedinger-Hat/certo.git apps/certo",
      "git -C apps/certo checkout 6fd0a11fe2ff616d49da2a935b3e9d2cb88e1ffe",
    ].join("\n"),
  );
  process.exit(1);
}

const args = ["compose", "-f", composeFile, "-f", "deploy/certo/compose.local.yml"];
if (action === "up") {
  const rebuild = ensureFreshInstallMigration();
  args.push("up", "-d");
  if (rebuild) args.push("--build");
  args.push("postgres", "mailhog", "backend");
}
else if (action === "down") args.push("down");
else {
  console.error("Usage: node scripts/certo.mjs up|down");
  process.exit(1);
}

function ensureFreshInstallMigration() {
  const migration = "apps/certo/src/backend/database/migrations/2026-08-06_add_profile_owner.js";
  if (!existsSync(migration)) return false;
  const source = readFileSync(migration, "utf8");
  if (source.includes("knex.schema.hasTable('profiles')")) return false;
  const guard = `  async up(knex) {
    // Fresh installs create profiles, including owner_id, during schema sync.
    // This migration runs before that sync, so the table is absent on first boot.
    const hasTable = await knex.schema.hasTable('profiles');
    if (!hasTable) {
      console.log('profiles table does not exist yet; schema sync will create owner_id');
      return;
    }

`;
  if (!source.includes("  async up(knex) {\n")) return false;
  writeFileSync(migration, source.replace("  async up(knex) {\n", guard));
  console.log("Patched Certo fresh-install migration so the first boot can create profiles.");
  return true;
}

const result = spawnSync("docker", args, { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
