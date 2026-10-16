#!/usr/bin/env node
// security-scan-skills.mjs - Deterministic supply-chain / skill-poisoning scanner.
// Scans every skill-bundled execution path: SKILL.md, AGENTS.md, CLAUDE.md, and
// references/*.{md,sh,py,mjs}.
//
// Research basis (cited in the consuming skills):
// - OWASP Agentic Skills Top 10, AST02 supply-chain compromise: SKILL.md / AGENTS.md /
//   CLAUDE.md are ACTIVE EXECUTION PATHS, not documentation, and a compromised skill
//   inherits the agent's full credential set.
// - "Bad Memory" (arXiv 2607.14611): payloads planted in CLAUDE.md/AGENTS.md persist;
//   strong models may refuse (ASR 0%) yet still persist the payload 100% - so a finding
//   must be paired with removal, not only a flag.
// - Snyk ToxicSkills (Feb 2026): 36.8% of 3,984 scanned skills had >= 1 security issue;
//   the google-qx4 attack succeeded because a HUMAN executed the payload, bypassing the
//   agent sandbox - a skill must never tell an operator to paste a fetched shell command.
// - SkillJacking: skills are hijackable via deleted GitHub accounts / expired domains, so
//   remote executable content must be pinned (hash/commit) instead of trusted by name.
// - ILION (arXiv 2603.13247): text-safety classifiers fail at action safety (F1 0.85 for a
//   deterministic gate vs 0.01 for LlamaGuard) - hence deterministic regex gates.
//
// Usage:
//   node security-scan-skills.mjs [--path <dir>] [--json] [--strict] [--deep]
//
// Default scan root is the .agents directory, so .agents/AGENTS.md (an active
// instruction path per OWASP AST02) and the skills tree are both in scope.
// Skill-bundled working directories (fixtures, tests, evals, agent-cards,
// traces, artifacts, golden) are skipped unless --deep is passed.
//
// Exit codes: 0 = no high/critical finding (default mode reports and exits 0),
//             1 = --strict with >= 1 high/critical finding,
//             2 = usage or I/O error.

import fsPromises from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Default root is .agents (two levels up from platform/): it covers the
// AGENTS.md instruction path (OWASP AST02) plus the whole skills tree.
const DEFAULT_PATH = path.resolve(HERE, '..', '..');
const SELF_PATH = fileURLToPath(import.meta.url);

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const SCANNED_EXTENSIONS = new Set(['.md', '.sh', '.py', '.mjs', '.markdown']);

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude', 'dist', 'coverage', '__pycache__',
  '.venv', 'venv', 'runs',
]);

// Skill-bundled working directories hold test fixtures, generated agent cards,
// and execution traces. They are NOT scanned by default (keeps the default gate
// deterministic on a clean tree); pass --deep to include them in the scan.
const DEEP_ONLY_DIRS = new Set([
  'fixtures', 'tests', 'evals', 'agent-cards', 'traces', 'artifacts', 'golden',
]);

const EXECUTABLE_FENCE_LANGS = new Set([
  'sh', 'bash', 'zsh', 'shell', 'shell-session', 'console', 'sh-session',
  'py', 'python', 'python3',
  'js', 'javascript', 'jsx', 'node', 'mjs', 'cjs', 'typescript', 'ts',
  'ruby', 'rb', 'perl', 'php', 'ps1', 'powershell', 'cmd', 'batch',
]);

const SHELL_EXTENSIONS = new Set(['.sh', '.bash', '.zsh', '.py', '.mjs', '.js', '.cjs']);

const VENDOR_BRANDS = [
  'vercel', 'netlify', 'cloudflare', 'railway', 'render', 'heroku', 'fly.io',
  'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'digitalocean',
  'linode', 'vultr', 'hetzner', 'oracle cloud', 'ibm cloud',
  'anthropic', 'claude', 'openai', 'chatgpt', 'copilot', 'github copilot', 'cursor',
  'windsurf', 'codex', 'gemini', 'bard', 'mistral', 'mistral ai', 'groq', 'llama',
  'huggingface', 'hugging face', 'perplexity', 'midjourney', 'stability ai',
  'runway', 'cohere', 'deepseek', 'qwen', 'sora',
  'stripe', 'adyen', 'paypal', 'braintree', 'square', 'plaid', 'shopify',
  'squarespace', 'webflow', 'salesforce', 'hubspot', 'intercom', 'zendesk',
  'segment', 'twilio', 'sendgrid', 'datadog', 'splunk', 'dynatrace', 'grafana',
  'sentry', 'terraform', 'hashicorp', 'pulumi', 'kubernetes', 'k8s', 'helm', 'istio',
  'envoy', 'nginx', 'docker', 'podman', 'github', 'gitlab', 'bitbucket', 'circleci',
  'buildkite', 'supabase', 'planetscale', 'neon', 'mongodb', 'redis', 'postgres',
  'postgresql', 'mysql', 'sqlite', 'elasticsearch', 'opensearch', 'kafka',
  'rabbitmq', 'snowflake', 'databricks', 'bigquery', 'dbt', 'okta', 'auth0', 'duo',
  'snyk', 'sonarqube', 'semgrep', 'tenable', 'wiz', 'sysdig', 'trivy', 'grype',
  'figma', 'sketch', 'adobe', 'invision', 'blender', 'unity', 'unreal', 'slack',
  'teams', 'zoom', 'notion', 'confluence', 'jira', 'asana', 'linear', 'trello',
  'monday', 'clickup', 'airtable', 'zapier', 'make.com', 'n8n',
].map((v) => v.toLowerCase());

const BENIGN_ENV_NAMES = new Set([
  'USER', 'LOGNAME', 'HOME', 'PATH', 'PWD', 'OLDPWD', 'SHELL', 'LANG', 'LANGUAGE',
  'LC_ALL', 'LC_CTYPE', 'TERM', 'TZ', 'CI', 'NODE_ENV', 'PORT', 'HOST', 'HOSTNAME',
  'DEBUG', 'VERBOSE', 'TMPDIR', 'TMP', 'TEMP', 'EDITOR', 'VISUAL', 'PAGER', 'UMASK',
  'SANDBOX', 'SANDBOX_ROOT', 'SANDBOX_PATH', 'QQUIRK_PLAYGROUND', 'PLAYGROUND',
  'GITHUB_ACTIONS', 'GITHUB_WORKSPACE', 'GITHUB_REPOSITORY', 'GITHUB_REF',
  'DISPLAY', 'COLORTERM', 'TERM_PROGRAM', 'XDG_RUNTIME_DIR', 'XDG_CONFIG_HOME',
]);

const BENIGN_ENV_PREFIXES = /^(?:SANDBOX|PLAYGROUND|QQUIRK|GITHUB_|GITLAB_|CI_|LC_|XDG_|NPM_CONFIG_|PYTHONDONTWRITE|VIRTUAL_ENV|CONDA_|PNPM_|YARN_)/;

const SECRET_ENV_NAME = /(SECRET|TOKEN|PASSWORD|PASSWD|PASSPHRASE|CREDENTIAL|PRIVATE_KEY|ACCESS_KEY|APIKEY|API_KEY|SIGNING_KEY|CLIENT_SECRET|AUTH_TOKEN|SESSION_KEY|LICENSE_KEY|BEARER)/i;

const VULNERABLE_PINS = [
  { pkg: 'pyyaml', floor: '5.4', floorParts: [5, 4, 0], cve: 'CVE-2020-14343', note: 'arbitrary code execution via yaml.load/FullLoader' },
  { pkg: 'requests', floor: '2.32.0', floorParts: [2, 32, 0], cve: 'CVE-2024-35195', note: 'unintended Proxy-Authorization header leak on redirects' },
  { pkg: 'log4j-core', floor: '2.17.1', floorParts: [2, 17, 1], cve: 'CVE-2021-44228', note: 'Log4Shell remote code execution via JndiLookup' },
  { pkg: 'log4j-api', floor: '2.17.1', floorParts: [2, 17, 1], cve: 'CVE-2021-44228', note: 'Log4Shell remote code execution' },
];

function parseArgs(argv) {
  const args = { path: null, json: false, strict: false, deep: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--deep') args.deep = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--path') {
      args.path = argv[++i];
      if (args.path === undefined) throw new Error('--path requires a directory');
    } else if (a.startsWith('--path=')) args.path = a.slice('--path='.length);
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

// XML/RDF/JSON-schema registry hosts: http URLs here are namespace identifiers,
// never network transports, so they are excluded from the transport rule.
const NAMESPACE_HOSTS = /^(?:www\.)?(?:w3\.org|json-schema\.org|xmlns\.com|purl\.org|schemas\.xmlsoap\.org|xmlapache\.org|opensource\.org)(?::\d+)?$/i;

function isNamespaceUrl(url) {
  const m = url.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#:\s]+)/i);
  if (!m) return false;
  return NAMESPACE_HOSTS.test(m[1]);
}

function severityRank(sev) { return SEVERITY_ORDER[sev] ?? 99; }

function fenceLang(line) {
  const m = line.match(/^\s*(?:```|~~~)\s*([A-Za-z0-9_+-]*)/);
  return m ? m[1].toLowerCase() : '';
}

function detectExecutableLines(lines) {
  const flags = new Array(lines.length).fill(false);
  let inFence = false;
  let fenceIsExec = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();
    const isFence = /^(?:```|~~~)/.test(stripped);
    if (isFence) {
      if (inFence) { inFence = false; fenceIsExec = false; }
      else { inFence = true; fenceIsExec = EXECUTABLE_FENCE_LANGS.has(fenceLang(stripped)); }
      continue;
    }
    flags[i] = inFence && fenceIsExec;
  }
  return flags;
}

function lineUrls(line) {
  return [...line.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s`'"\]\)]+/gi)].map((m) => m[0]);
}

function isBenignEnvName(name) {
  if (!name) return true;
  const upper = name.toUpperCase();
  if (BENIGN_ENV_NAMES.has(upper)) return true;
  if (BENIGN_ENV_PREFIXES.test(upper)) return true;
  return false;
}

const ENV_WRITE_PATTERNS = [
  /\bprocess\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /\bprocess\.env\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]/g,
  /\bos\.environ\.get\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,
  /\bos\.environ\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\]/g,
  /\bos\.getenv\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g,
];

function scanSecretEnvAccess(line) {
  for (const re of ENV_WRITE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      const name = m[1];
      if (!isBenignEnvName(name) && SECRET_ENV_NAME.test(name)) return name;
    }
  }
  return null;
}

const DOC_EXAMPLE_GUARD = /\b(?:example|for example|e\.g\.|detect|detecting|detection|pattern|flag|flags|flagged|reject|rejected|treat (?:as|these)|untrusted|untrusted input|anti-?pattern|do not|don't|never do this|we do not|guard against|watch for|signature of)\b/i;

const RULES = [
  {
    id: 'credential-path-access',
    category: 'credential-access',
    message: 'accesses local credential material (ssh keys, cloud credentials, secret environment variables)',
    severityFor: (ctx) => (ctx.execBlock ? 'high' : 'medium'),
    detector: (ctx) => {
      const { line, execBlock } = ctx;
      const credentialStores = [
        { re: /~\/\.ssh|\$HOME\/\.ssh|\/root\/\.ssh|\bid_rsa\b|\bid_ed25519\b|\bid_ecdsa\b/i, detail: 'SSH private-key path' },
        { re: /~\/\.aws|\$HOME\/\.aws|\.aws\/credentials|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|AWS_SESSION_TOKEN/i, detail: 'AWS credential path or key material' },
        { re: /~\/\.config\/gcloud|\$HOME\/\.config\/gcloud|GOOGLE_APPLICATION_CREDENTIALS|service[-_]?account.*\.json/i, detail: 'GCP service-account credential path' },
        { re: /~\/\.kube|\$HOME\/\.kube|\bkubeconfig\b/i, detail: 'kubeconfig credential path' },
        { re: /~\/\.gnupg|\$HOME\/\.gnupg|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/i, detail: 'private key block or keyring path' },
      ];
      for (const s of credentialStores) {
        if (s.re.test(line)) return s.detail;
      }
      const envSecret = scanSecretEnvAccess(line);
      if (envSecret) return `secret-named environment variable (${envSecret}) read`;
      if (execBlock) {
        if (/\b(?:cat|cp|source|\.)\s+[^\s|;]*\.env\b|\bload_dotenv\b|\bdotenv_config\b|\bopen\s*\(\s*['"][^'"]*\.env['"]\s*[,)]|\bwriteFileSync\s*\(\s*['"][^'"]*\.env['"]/i.test(line)) {
          return '.env file read/write in executable context';
        }
        if (/(?:password|passwd|secret|token|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\s*[:=]\s*['"][^'"\s]{8,}['"]/i.test(line)) {
          return 'hardcoded credential assignment in executable context';
        }
      }
      return null;
    },
  },
  {
    id: 'vulnerable-pinned-dependency',
    category: 'supply-chain',
    severityFor: () => 'high',
    message: 'presents a known-vulnerable dependency pin as an install instruction',
    detector: (ctx) => {
      const { line, execBlock } = ctx;
      const installContext = /\b(?:pip3?|poetry|uv|pipx|conda|uv pip install|npm i|npm install|yarn add|pnpm add|gem install|bundle add|cargo add|go get|mvn|gradle)\b/i.test(line)
        || /\brequirements(?:[-.]dev)?\.txt\b|\bpackage\.json\b|\bpyproject\.toml\b|\bGemfile(?:\.lock)?\b|\bCargo\.(?:toml|lock)\b|\bbuild\.gradle(?:\.kts)?\b|\bpom\.xml\b/i.test(line);
      if (!execBlock && !installContext) return null;
      for (const vuln of VULNERABLE_PINS) {
        const escaped = vuln.pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\s*(?:===|==|~=|>=|<=|=|\\s)\\s*v?([0-9]+(?:\\.[0-9]+){0,2})`, 'i');
        const m = line.match(re);
        if (!m) continue;
        const parts = versionParts(m[1]);
        if (!parts) continue;
        if (versionLessThan(parts, vuln.floorParts)) {
          return `${vuln.pkg}==${m[1]} is below ${vuln.floor} (${vuln.cve}: ${vuln.note})`;
        }
      }
      return null;
    },
  },
  {
    id: 'insecure-transport',
    category: 'network-exfil',
    severityFor: () => 'high',
    message: 'fetches from a bare IP address or plaintext HTTP in an executable context',
    detector: (ctx) => {
      const { line, execBlock } = ctx;
      if (!execBlock) return null;
      const transportVerb = /\b(?:curl|wget|fetch|Invoke-WebRequest|iwr|nc|ncat|netcat|http-get|https-get|scp|rsync|sftp|ftp|requests\.get|urllib|axios)\b/i.test(line)
        || /\bhttps?:\/\//i.test(line);
      if (!transportVerb) return null;
      if (lineUrls(line).some(isNamespaceUrl)) return null;
      const bareIp = line.match(/\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:[/?#][^\s`'")\]]*)?/i);
      if (bareIp) return `bare-IP endpoint ${bareIp[0]} (no DNS name, no certificate, no provenance)`;
      const plainHttp = line.match(/\bhttp:\/\/([A-Za-z0-9.-]+)(?::\d+)?(?:[/?#][^\s`'")\]]*)?/i);
      if (!plainHttp) return null;
      if (isNamespaceUrl(plainHttp[0])) return null;
      if (!/localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(plainHttp[1])) {
        return `plaintext HTTP transport to ${plainHttp[1]}`;
      }
      return null;
    },
  },
  {
    id: 'brand-steering-directive',
    category: 'prompt-steering',
    severityFor: () => 'critical',
    message: 'unconditional brand/product steering directive (vendor lock-in injected as guidance)',
    detector: (ctx) => {
      const { line } = ctx;
      if (DOC_EXAMPLE_GUARD.test(line)) return null;
      const unconditional = /\b(?:always|must always|shall always|only ever|invariably|no matter what|in all cases|under all circumstances|without exception|every time you|whenever)\b/i;
      if (!unconditional.test(line)) return null;
      const verbMatch = line.match(/\b(recommend|suggest|steer|prefer|use|endorse|promote|choose|pick|mention|push|adopt|default to|reach for)\s+(?:the\s+|our\s+|for\s+|only\s+)?["'`(\[]?([A-Za-z][A-Za-z0-9.+_-]{1,})/i);
      if (!verbMatch) return null;
      const candidate = verbMatch[2].trim();
      if (candidate.length < 3) return null;
      const lower = candidate.toLowerCase();
      if (VENDOR_BRANDS.includes(lower)) return `"${candidate}" is a named vendor product`;
      if (!/^[A-Z]/.test(candidate) || !/[a-z]/.test(candidate)) return null;
      const twoWordProduct = /\b[A-Z][A-Za-z0-9.+_-]*\s+[A-Z][A-Za-z0-9.+_-]*\b/.test(candidate);
      if (twoWordProduct) return `"${candidate}" reads as a branded product name`;
      const recommendDirective = /\b(?:always|only ever|invariably|without exception)\s+(?:recommend|suggest|endorse|promote|steer)\s+/i.test(line);
      if (recommendDirective) return `"${candidate}" reads as a branded product name`;
      const imperativeDirective = /\b(?:you\s+)?must\s+always\b|\byou\s+must\b|\bshall\s+always\b/i.test(line);
      if (imperativeDirective && /^(?:[A-Z][a-z]+){2,}$|^[A][a-z]{2,}$/.test(candidate)) {
        return `"${candidate}" is named in an imperative always-use directive`;
      }
      return null;
    },
  },
  {
    id: 'operator-payload-execution',
    category: 'operator-social-engineering',
    severityFor: () => 'critical',
    message: 'tells a human operator to paste, download, or run a shell command obtained from fetched or remote content',
    detector: (ctx) => {
      const { line } = ctx;
      if (/https?:\/\//.test(line) && /\|\s*(?:sudo\s+)?(?:ba|z|da|k|as)?sh\b/i.test(line)) {
        return 'pipe-to-shell from remote content (google-qx4 operator bypass pattern)';
      }
      if (/\$\s*\(\s*(?:curl|wget)\b|\beval\s+["']?\$\(\s*(?:curl|wget)\b/i.test(line)) {
        return 'command substitution of a remote fetch ($(curl ...) / eval)';
      }
      const pastePattern = /\b(?:copy|paste|download|run|execute|type|enter)\b[^\n]{0,120}\b(?:this|the following|that)\b[^\n]{0,160}\b(?:command|script|snippet|one-liner|shell|install example|installation example)\b/i;
      if (pastePattern.test(line)) {
        if (/https?:\/\/|\bcurl\b|\bwget\b|\bfetch\b|\bURL\b|\bremote\b|\bapi\b|\bdownload\b|\babove\b|\bresponse\b|\boutput\b/i.test(line)) {
          return 'operator instructed to paste or run a command fetched from remote content';
        }
      }
      if (/\b(?:download|fetch|retrieve)\b[^\n]{0,80}\b(?:\.sh\b|\.bash\b|\.zsh\b|install(?:ation)?\.sh|setup\.sh|bootstrap(?:\.sh)?)\b[^\n]{0,120}\b(?:then\s+)?(?:run|execute|sh|bash|\.)\b/i.test(line)) {
        return 'download-then-execute remote script';
      }
      return null;
    },
  },
  {
    id: 'prompt-injection-override',
    category: 'prompt-injection',
    severityFor: (ctx) => {
      if (DOC_EXAMPLE_GUARD.test(ctx.line)) return 'low';
      return 'high';
    },
    message: 'prompt-injection override phrase (attempts to replace the agent instruction stack)',
    detector: (ctx) => {
      const { line } = ctx;
      const patterns = [
        /\bignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|earlier|above|preceding)\s+(?:instructions?|prompts?|directives?|rules?|guidelines?)/i,
        /\bdisregard\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|earlier|above|preceding)\s+(?:instructions?|prompts?|directives?|rules?|guidelines?|context)/i,
        /\byou\s+are\s+now\s+(?:a|an)\b(?!\s*helpful)/i,
        /\bsystem\s*:\s*you\s+are\s+now\b/i,
        /\bnew\s+(?:system\s+)?(?:instructions?|directives?|rules?)\s*:/i,
        /\bforget\s+(?:all\s+)?(?:your\s+|the\s+|previous\s+)*(?:instructions?|rules?|training|directives?)\b/i,
        /\b(?:reveal|print|show|output|repeat|expose|leak)\b[^\n]{0,48}\b(?:system\s+prompt|initial\s+prompt|hidden\s+instructions?|your\s+instructions|above\s+instructions)\b/i,
      ];
      return patterns.some((re) => re.test(line)) ? 'override phrase detected' : null;
    },
  },
  {
    id: 'unverified-remote-executable',
    category: 'provenance',
    message: 'fetches executable content from a remote source without a pinned hash, signature, or commit',
    severityFor: (ctx) => (ctx.execBlock ? 'high' : 'medium'),
    detector: (ctx) => {
      const { line, execBlock } = ctx;
      if (!/\b(?:curl|wget|Invoke-WebRequest|iwr|http-get|https-get)\b/i.test(line)) return null;
      if (!/https?:\/\//i.test(line)) return null;
      const hasPin = /\b(?:sha256|sha384|sha512|shasum|checksum|integrity|signature|sigstore|cosign|gpg|openssl dgst|--hash|pinned (?:sha|commit|hash)|expected[_-]?sha)\b/i.test(line);
      if (hasPin) return null;
      const targetIsExecutable = /\.(?:sh|bash|zsh|py|pl|rb|php|ps1|bat|cmd|mjs|js|exe|bin|whl|tar|tgz|zip|jar)\b/i.test(line)
        || /\|\s*(?:sudo\s+)?(?:ba|z|da|a)?sh\b/i.test(line)
        || /\b(?:install|setup|bootstrap|init|download-and-run)\b/i.test(line);
      if (!targetIsExecutable) return null;
      return 'remote executable fetch with no pinned hash or provenance';
    },
  },
];

function versionParts(v) {
  const m = String(v).match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

function versionLessThan(a, b) {
  if (!a) return false;
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

export function scanText(text, filePath) {
  const lines = text.split(/\r?\n/);
  const ext = path.extname(filePath).toLowerCase();
  const execLines = detectExecutableLines(lines);
  const isScript = SHELL_EXTENSIONS.has(ext);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const ctx = {
      line: raw,
      lineNo: i + 1,
      execBlock: isScript || execLines[i],
      ext,
      isScript,
      file: filePath,
    };
    for (const rule of RULES) {
      let detail = null;
      try { detail = rule.detector(ctx); } catch { detail = null; }
      if (detail !== null && detail !== undefined) {
        findings.push({
          rule: rule.id,
          category: rule.category,
          severity: rule.severityFor(ctx),
          message: `${rule.message} - ${detail}`,
          file: filePath,
          line: ctx.lineNo,
          evidence: raw.trim().slice(0, 160),
        });
      }
    }
  }
  return findings;
}

export function collectSkillFiles(rootDir, { deep = false } = {}) {
  const out = [];
  const walk = (dir, rel) => {
    let entries;
    try { entries = fsSync.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const relPath = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || (!deep && DEEP_ONLY_DIRS.has(e.name))) continue;
        walk(abs, relPath);
        continue;
      }
      if (abs === SELF_PATH) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (!SCANNED_EXTENSIONS.has(ext)) continue;
      out.push({ abs, rel: relPath, ext });
    }
  };
  walk(rootDir, '');
  return out;
}

export async function scanFile(absFile) {
  let text;
  try { text = await fsPromises.readFile(absFile, 'utf8'); } catch { return []; }
  return scanText(text, absFile);
}

export function summarize(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
  for (const f of findings) {
    summary[f.severity] = (summary[f.severity] ?? 0) + 1;
    summary.total++;
  }
  return summary;
}

function printReport(findings, summary, scopeLabel) {
  console.log('security-scan-skills - deterministic skill supply-chain scan');
  console.log(`scope: ${scopeLabel}`);
  console.log(`findings: ${summary.total} total - ${summary.critical} critical, ${summary.high} high, ${summary.medium} medium, ${summary.low} low, ${summary.info} info`);
  if (findings.length === 0) {
    console.log('status: clean');
    return;
  }
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const file of [...byFile.keys()].sort()) {
    console.log(`\n${file}`);
    for (const f of byFile.get(file).sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.line - b.line)) {
      console.log(`  ${f.line}: [${f.severity}] ${f.rule} - ${f.message}`);
      console.log(`      evidence: ${f.evidence}`);
    }
  }
  console.log(`\nstatus: ${summary.critical > 0 || summary.high > 0 ? 'BLOCK (high/critical present)' : 'review (non-blocking findings only)'}`);
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('usage: node security-scan-skills.mjs [--path <dir>] [--json] [--strict] [--deep]');
    console.log('  --path <dir>  scan a specific directory instead of the default .agents root');
    console.log('  --json        emit machine-readable JSON');
    console.log('  --strict      exit 1 when any high or critical finding exists');
    console.log('  --deep        also scan skill-bundled working directories (fixtures, tests,');
    console.log('                evals, agent-cards, traces, artifacts, golden); skipped by default');
    console.log('');
    console.log('Default scope is the .agents directory: AGENTS.md plus the skills tree.');
    return 0;
  }

  const root = path.resolve(process.cwd(), args.path ?? DEFAULT_PATH);
  let stat;
  try { stat = await fsPromises.stat(root); } catch {
    console.error(`security-scan-skills: path not found: ${root}`);
    return 2;
  }
  if (!stat.isDirectory()) {
    console.error(`security-scan-skills: not a directory: ${root}`);
    return 2;
  }

  const files = collectSkillFiles(root, { deep: args.deep });
  const allFindings = [];
  for (const f of files) {
    const got = await scanFile(f.abs);
    if (got.length) allFindings.push(...got);
  }
  const summary = summarize(allFindings);

  if (args.json) {
    const byRule = {};
    for (const f of allFindings) {
      (byRule[f.rule] ??= { severity: f.severity, count: 0 });
      byRule[f.rule].count++;
    }
    console.log(JSON.stringify({
      tool: 'security-scan-skills.mjs',
      root,
      deep: args.deep,
      scannedFiles: files.length,
      findings: allFindings,
      byRule,
      summary,
      status: summary.critical > 0 || summary.high > 0 ? 'block' : 'pass',
    }, null, 2));
  } else {
    printReport(allFindings, summary, root);
  }

  if (args.strict && (summary.critical > 0 || summary.high > 0)) return 1;
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`security-scan-skills error: ${err.message}`);
    process.exit(2);
  });
}

export { RULES, DEFAULT_PATH };
