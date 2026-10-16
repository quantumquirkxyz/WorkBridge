# MCP servers

Three Model Context Protocol servers live in this directory. They share one
protocol (`2024-11-05`), one bundle, and one security contract, and they
complement each other instead of overlapping:

| Server | Transports | Tool surface | Resources | Prompts | Use it for |
|---|---|---|---|---|---|
| `mcp-skills-server.mjs` | HTTP `POST /mcp` (default port 3000) and `--stdio` | 7 fixed tools (`list_skills`, `get_skill`, `search_skills`, `resolve_skill_for_task`, `validate_skill`, `score_skill`, `get_registry_info`) | none | none | the original HTTP deployment |
| `server.mjs` | `--stdio` only | one dynamic `skill_<name>` tool per skill, plus `list_skills`, `get_skill`, `get_artifact_schema`, `a2a_discover`, `a2a_invoke` | `skill://<name>/SKILL.md` | `prompts/list` only (`prompts/get` is not implemented) | stdio clients that want a tool per skill plus A2A discovery |
| `mcp-skill-lab-server.mjs` | `--stdio` and `--port N` (HTTP `POST /mcp` plus `GET /health`) | 9 stable tools, listed below | registry, catalog, skill, fixtures, and runtime manifests | `prompts/list` and `prompts/get` | the complete, minimal, stable contract |

`mcp-skill-lab-server.mjs` is the consolidated server: it joins the tool
surface, the resource surface, and a working `prompts/get` in a single file
with zero npm dependencies. The two production servers stay untouched, so
existing deployments keep working.

## Launch

```bash
# consolidated server, stdio (default transport)
node .agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --stdio

# consolidated server, HTTP on the port of your choice
node .agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --port 8787

# offline demo: initialize, tools/list, and one route_task call, then exit
node .agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --demo --json

# the two pre-existing servers
node .agents/skills/platform/mcp-server/mcp-skills-server.mjs --port 3000
node .agents/skills/platform/mcp-server/server.mjs --stdio
```

All servers read the bundle from the repository root and exclude the
`platform` domain, matching the rest of the tooling.

## Tools of the consolidated server

| Tool | Arguments | Returns |
|---|---|---|
| `list_skills` | `domain?`, `trustTier?`, `allowHighTrust?` | bundle skills, filtered; plus `excludedHighTrust[]` |
| `get_skill` | `skill` (`domain/name`) | parsed frontmatter and the full body |
| `search_skills` | `query`, `limit?`, `allowHighTrust?` | BM25 ranking from `platform/index/skill-index.json`, with a token-overlap fallback when the index is absent |
| `route_task` | `task`, `limit?`, `allowHighTrust?` | top-3 skills from the shared skill graph, each with its reason |
| `validate_skill` | `skill` | structural checks: required frontmatter, lockfile hash, dependency resolution |
| `run_quality_gate` | `check?`, `timeoutMs?` | runs `check-all.mjs` or one named checker and reports status |
| `get_registry_info` | none | version, compatible agents, counts, domains, channels |
| `get_side_effect_policy` | `skill` | `sideEffects`, `approvalRequired`, `approvalFor`, `risk`, `trustTier` |
| `explain_routing` | `task`, `limit?` | matched terms per field plus the graph reason for each candidate |

Every tool declares a draft-07 `inputSchema`, and `tools/call` arguments are
validated against it before the handler runs.

## Resources

| URI | Content | MIME |
|---|---|---|
| `skill://registry` | `registry.yaml`, pretty printed | `application/json` |
| `skill://catalog` | `CATALOG.md` | `text/markdown` |
| `skill://skill/<domain>/<name>` | the `SKILL.md` of one skill (extra path segments read other files inside the skill directory) | `text/markdown` |
| `skill://fixtures/<type>/<name>` | a fixture under `platform/fixtures/<type>/` | `application/json` |
| `skill://manifest/<domain>/<name>` | the runtime manifest under `platform/manifests/` | `application/json` |

`resources/read` resolves the URI inside the repository and refuses anything
that escapes it, so a crafted URI fails with a JSON-RPC error instead of
reading a file outside the bundle.

## Prompts

| Prompt | Arguments | Generated from |
|---|---|---|
| `use_skill` | `skill`, `task` | the real skill: description, trust tier, approval gates, and the full `SKILL.md` |
| `author_skill` | `name`, `domain`, `description` | the repository authoring conventions and the gate command |
| `evaluate_skill` | `skill`, `task?` | the skill plus its declared `fixturesPath` |

## Security rules

1. **Trust tier.** Skills with `trustTier > 3` are never exposed through
   listing, search, routing, or explanation unless the call passes
   `allowHighTrust: true`. The bundle has a single such skill
   (`routing/ship-subissue`, tier 4); its id is reported in the
   `excludedHighTrust[]` field of every `tools/list` response and logged on
   stderr at startup. This mirrors the rule in the `foundation/mcp-server`
   skill: high-trust skills require an explicit allow-list.
2. **Redaction.** Every tool payload passes through a local `redact()` before
   it reaches a client. Values whose key matches `authorization`, `api_key`,
   `apiKey`, `token`, `secret`, `password`, `cookie`, or `set-cookie` (any
   casing) are replaced with `[REDACTED]`, recursively. Nothing is written to
   the logs.
3. **Path traversal.** Resource URIs are resolved against the repository root
   and rejected with error `-32002` when they try to escape it.
4. **Standard error codes.** `-32700` parse error, `-32600` invalid request,
   `-32601` method or tool not found, `-32602` invalid params (schema
   validation), `-32603` internal error, `-32002` resource not found or
   traversal blocked.

## Flight recorder

`../scripts/mcp-flight-recorder.mjs` is a local proxy that records every
JSON-RPC message between a client and a server — the equivalent of a
Wireshark capture for MCP. It stores only hashes and metadata
(`ts`, `direction`, `method`, `toolName`, `inputHash`, `outputHash`,
`durationMs`, `errorCode`, `traceId`), redacts payloads before hashing, and
can replay a stored trace as a timeline:

```bash
# record a stdio session against the consolidated server
node .agents/skills/platform/scripts/mcp-flight-recorder.mjs --stdio \
  --command "node .agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --stdio" \
  --out .agents/skills/platform/mcp-recorder/session.jsonl

# proxy an HTTP server that listens on port 3000
node .agents/skills/platform/scripts/mcp-flight-recorder.mjs --http --port 3000 --listen 8788

# print a stored trace without executing anything
node .agents/skills/platform/scripts/mcp-flight-recorder.mjs --replay .agents/skills/platform/mcp-recorder/session.jsonl
```

## Client examples

stdio session (one JSON-RPC object per line, one response per line):

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"example","version":"1.0.0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"route_task","arguments":{"task":"review a pull request"}}}' \
  | node .agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --stdio
```

HTTP session against a server started with `--port 8787`:

```bash
curl -s -X POST http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -s http://localhost:8787/health
```

A `tools/call` response wraps the payload as MCP content:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"task\": \"review a pull request\",\n  \"results\": [{ \"skill\": \"delivery/review-pr\" }]\n}"
      }
    ]
  }
}
```

## Tests and gate

The contract is covered by `../tests/mcp-contract.test.mjs` (real stdio
handshake, tool and resource calls, traversal guard, prompt rendering, and a
recorded flight-recorder session). The full gate runs it together with the
rest of the platform suite:

```bash
node ../check-all.mjs
```
