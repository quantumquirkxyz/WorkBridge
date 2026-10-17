import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const issueUrl = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/issues\/(\d+)\/?(?:[?#].*)?$/;

function fail(error, skipped = []) {
  process.stdout.write(`${JSON.stringify({ ok: false, error, skipped, created: [] }, null, 2)}\n`);
  process.exit(1);
}

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function tryRun(command, args, cwd) {
  try {
    return { ok: true, output: run(command, args, cwd) };
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr) : error.message;
    return { ok: false, output: stderr.trim() };
  }
}

function parseArgs(argv) {
  let base = "";
  const urls = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--base") {
      base = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--base=")) {
      base = arg.slice("--base=".length);
    } else if (arg === "--") {
      urls.push(...argv.slice(i + 1));
      break;
    } else if (arg.startsWith("-")) {
      fail(`Unknown argument: ${arg}`);
    } else {
      urls.push(arg);
    }
  }
  return { base, urls };
}

function slug(title) {
  const cleaned = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return cleaned;
}

function originRepo(root) {
  const remote = tryRun("git", ["remote", "get-url", "origin"], root);
  if (!remote.ok) fail("This checkout has no origin remote.");
  const match = remote.output.match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  if (!match) fail(`origin is not a GitHub repo: ${remote.output}`);
  return { owner: match[1], repo: match[2] };
}

function resolveBase(root, base) {
  if (!base) fail("Missing --base <branch>. Name the branch the issue worktrees start from.");
  const fetched = tryRun("git", ["fetch", "origin", base], root);
  const remote = tryRun("git", ["rev-parse", "--verify", "--quiet", `origin/${base}`], root);
  if (remote.ok && remote.output) {
    return { ref: `origin/${base}`, fetched: fetched.ok };
  }
  const local = tryRun("git", ["rev-parse", "--verify", "--quiet", base], root);
  if (local.ok && local.output) {
    return { ref: base, fetched: fetched.ok };
  }
  fail(`Base branch not found locally or on origin: ${base}`);
}

function promptFor(entry) {
  return [
    `You are working only in this git worktree: ${entry.path}`,
    `Branch ${entry.branch} is already checked out. Do not switch branches. Do not push. Do not touch the primary checkout or any other worktree.`,
    `Issue: ${entry.url}`,
    `Title: ${entry.title}`,
    entry.body,
    "",
    `Implement this issue in this worktree. Follow the repository conventions. Run the tests that cover the change. When the change is complete, commit on this branch with a conventional message that references #${entry.number}. Report the branch, the commits, and anything left open.`,
  ].join("\n");
}

function loadIssue(owner, repo, number) {
  const viewed = tryRun(
    "gh",
    ["issue", "view", String(number), "--repo", `${owner}/${repo}`, "--json", "number,title,body,state,url"],
    process.cwd(),
  );
  if (!viewed.ok) return { error: `Could not read issue #${number}: ${viewed.output}` };
  return { issue: JSON.parse(viewed.output) };
}

const { base, urls } = parseArgs(process.argv.slice(2));
if (urls.length === 0) fail("Pass at least one GitHub issue URL.");

const rootResult = tryRun("git", ["rev-parse", "--show-toplevel"]);
if (!rootResult.ok) fail("Run this from inside the git repository.");
const root = rootResult.output;
const { owner, repo } = originRepo(root);
const baseRef = resolveBase(root, base);

const planned = [];
const skipped = [];
for (const url of urls) {
  const match = url.match(issueUrl);
  if (!match) {
    skipped.push({ url, reason: "not a GitHub issue URL" });
    continue;
  }
  const [, linkOwner, linkRepo, numberText] = match;
  if (linkOwner !== owner || linkRepo !== repo) {
    skipped.push({ url, reason: `issue is in ${linkOwner}/${linkRepo}, not ${owner}/${repo}` });
    continue;
  }
  const loaded = loadIssue(owner, repo, numberText);
  if (loaded.error) {
    skipped.push({ url, reason: loaded.error });
    continue;
  }
  const issue = loaded.issue;
  if (issue.state !== "OPEN") {
    skipped.push({ url: issue.url, reason: `issue is ${issue.state}` });
    continue;
  }
  const number = issue.number;
  const branch = `issue/${number}${slug(issue.title) ? `-${slug(issue.title)}` : ""}`;
  const path = resolve(dirname(root), `${basename(root)}-worktrees`, `issue-${number}`);
  const body = typeof issue.body === "string" ? issue.body.slice(0, 8000) : "";
  planned.push({
    number,
    url: issue.url,
    title: issue.title,
    body,
    branch,
    path,
    base: baseRef.ref,
  });
}

if (skipped.length > 0) {
  fail("Nothing was created. Fix the skipped issues and run again.", skipped);
}

const seenBranches = new Set();
const seenPaths = new Set();
for (const entry of planned) {
  if (seenBranches.has(entry.branch) || seenPaths.has(entry.path)) {
    skipped.push({ url: entry.url, reason: "duplicate issue in this run" });
  }
  seenBranches.add(entry.branch);
  seenPaths.add(entry.path);
  const branchExists = tryRun("git", ["show-ref", "--verify", "--quiet", `refs/heads/${entry.branch}`], root);
  if (branchExists.ok) skipped.push({ url: entry.url, reason: `branch already exists: ${entry.branch}` });
  if (existsSync(entry.path)) skipped.push({ url: entry.url, reason: `worktree path already exists: ${entry.path}` });
}
if (skipped.length > 0) fail("Nothing was created. Existing branches or paths block this run.", skipped);

const worktreeRoot = resolve(dirname(root), `${basename(root)}-worktrees`);
mkdirSync(worktreeRoot, { recursive: true });
const created = [];
for (const entry of planned) {
  const added = tryRun("git", ["worktree", "add", "-b", entry.branch, entry.path, baseRef.ref], root);
  if (!added.ok) {
    for (const made of created) {
      tryRun("git", ["worktree", "remove", "--force", made.path], root);
      tryRun("git", ["branch", "-D", made.branch], root);
    }
    fail(`git worktree add failed for #${entry.number}: ${added.output}`, skipped);
  }
  created.push({ ...entry, prompt: promptFor(entry) });
}

const manifestPath = join(worktreeRoot, "manifest.json");
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { created: [] };
const merged = {
  base: baseRef.ref,
  fetched: baseRef.fetched,
  created: [...(previous.created ?? []).filter((item) => !created.some((next) => next.number === item.number)), ...created],
};
writeFileSync(manifestPath, `${JSON.stringify(merged, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, manifestPath, created }, null, 2)}\n`);
