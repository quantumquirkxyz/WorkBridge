import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const action = process.argv[2];
const composeFile = "../certo/docker-compose.yml";

if (!existsSync(composeFile)) {
  console.error(
    [
      "Certo clone missing.",
      "From Agent-Hackathon run:",
      "git clone https://github.com/Schroedinger-Hat/certo.git ../certo",
      "git -C ../certo checkout 6fd0a11fe2ff616d49da2a935b3e9d2cb88e1ffe",
    ].join("\n"),
  );
  process.exit(1);
}

const args = ["compose", "-f", composeFile, "-f", "deploy/certo/compose.local.yml"];
if (action === "up") args.push("up", "-d", "postgres", "mailhog", "backend");
else if (action === "down") args.push("down");
else {
  console.error("Usage: node scripts/certo.mjs up|down");
  process.exit(1);
}

const result = spawnSync("docker", args, { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
