# Health Baseline

Run these checks before spawning the parallel sub-agents. The baseline provides objective signals that complement subjective findings. Record all results and pass them as shared context to each sub-agent.

## Checks

### 1. LOC and Module Count

**Command:**
- Use `find` or equivalent to count source files in the project.
- Count lines with `wc -l` or equivalent.
- Identify module boundaries by top-level directories or primary namespaces.

**Signals to record:**
- `loc`: total lines of source code
- `module_count`: number of top-level modules or packages
- `source_dirs`: list of primary source directories

**Interpretation:**
- `loc` < 1000: small project, most findings have high impact
- `loc` 1000–10000: medium project, standard assessment applies
- `loc` > 10000: large project, focus on architectural seams and coupling

### 2. Dependency Health

**Command:**
- Inspect dependency manifest (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.).
- Check for lockfile status and outdated packages using standard tooling.
- Scan for known vulnerabilities using standard advisories.

**Signals to record:**
- `dependency_health`: `<Healthy / Stale / Vulnerable / Orphaned>`
- `outdated_count`: number of outdated direct dependencies
- `vulnerable_count`: number of dependencies with known advisories
- `orphaned_count`: number of dependencies with no maintainer activity

**Interpretation:**
- Any `Vulnerable` finding is High risk and must appear as P0 in the priority matrix.
- `Stale` or `Orphaned` findings are Medium risk unless they affect core paths.

### 3. Test Coverage Signal

**Command:**
- Check for test directories (`tests/`, `test/`, `__tests__`, etc.).
- Check for CI configuration (`.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc.).
- If a coverage tool is configured, extract the coverage percentage.
- If no tool is configured, compute `test_loc_ratio` = test LOC / total LOC.

**Signals to record:**
- `ci_present`: `<true / false>`
- `test_loc_ratio`: `<ratio or N/A>`
- `coverage_pct`: `<percentage or N/A>`

**Interpretation:**
- `ci_present: false`: Low confidence on functionality findings; mark all functionality findings as at least `Medium` confidence.
- `test_loc_ratio` < 0.1: Insufficient test coverage; functionality findings should downgrade numeric score by 1.
- `coverage_pct` > 80%: High confidence on functionality findings.

### 4. Cross-Import Signal

**Command:**
- For each source file, extract import statements.
- Count imports that cross module boundaries (i.e., imports from a different top-level directory or package).
- Compute `cross_import_count` = total cross-module imports.
- Identify any module with cross-imports to ≥50% of other modules.

**Signals to record:**
- `cross_import_count`: total number of cross-module imports
- `god_module_candidates`: list of modules with ≥50% cross-imports

**Interpretation:**
- `cross_import_count` > 100: Elevated coupling risk; scalability findings should downgrade numeric score by 1.
- Any `god_module_candidates`: High risk for scalability; must appear as P0 or P1 in the priority matrix.

### 5. Configuration Drift Signal

**Command:**
- Check for uncommitted changes in configuration files (`.env`, `docker-compose.yml`, `terraform/`, `k8s/`, etc.).
- Check for IaC files without corresponding ADR mentions.

**Signals to record:**
- `config_drift`: `<None / Minor / Major>`
- `uncommitted_config_files`: list of config files with uncommitted changes
- `iac_without_adr`: list of IaC files not mentioned in any ADR

**Interpretation:**
- Any `Major` drift: High risk for viability and functionality.
- Any `iac_without_adr`: Medium risk for scalability; IaC is an ungoverned seam.

## Passing Baseline to Sub-agents

After collecting all signals, format them as a `baseline` section in the shared context:

```yaml
baseline:
  loc: <number>
  module_count: <number>
  dependency_health: <summary>
  outdated_count: <number>
  vulnerable_count: <number>
  orphaned_count: <number>
  ci_present: <true / false>
  test_loc_ratio: <ratio or N/A>
  coverage_pct: <percentage or N/A>
  cross_import_count: <number>
  god_module_candidates: <list>
  config_drift: <summary>
  uncommitted_config_files: <list>
  iac_without_adr: <list>
```

Sub-agents must reference baseline signals in their findings where applicable (e.g., "Low test coverage (`coverage_pct: 12%`) reduces confidence in completeness claim").
