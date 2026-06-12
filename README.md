# node-security-pipeline

A production-ready Node.js + Express + TypeScript API with a **5-layer security pipeline** — from your local machine all the way to production runtime. Clone it, drop it on top of your project, and every push is protected automatically.

---

## What This Solves

| Risk | Where it's blocked |
|------|--------------------|
| Secrets accidentally committed (API keys, passwords) | Layer 1 & 2 |
| Vulnerable npm dependencies | Layer 1 & 4 |
| Bad code merged without review | Layer 3 |
| Security issues in source code (SAST) | Layer 4 |
| Vulnerable Docker image deployed to production | Layer 4 |
| HTTP attacks in production (XSS, clickjacking, brute-force) | Layer 5 |

---

## Prerequisites

| Tool | Windows | macOS | Linux |
|------|---------|-------|-------|
| Node.js 22 | [nodejs.org](https://nodejs.org) | `brew install node@22` | `nvm install 22` |
| Docker | [Docker Desktop](https://www.docker.com/products/docker-desktop) | Docker Desktop | Docker Engine |
| Git | [Git for Windows](https://git-scm.com) | `brew install git` | `apt install git` |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/JohnnySR605/node-security-pipeline.git
cd node-security-pipeline/secure-express-api/repo

# 2. Install dependencies (Husky hooks install automatically)
npm install

# 3. Copy environment file and fill in values
cp .env.example .env

# 4. Run in development
npm run dev

# 5. Or run with Docker
docker compose up
```

Once you run `npm install`, the Git hooks (Layer 2) are active immediately — no extra setup needed.

---

## The 5-Layer Security Pipeline

### Layer 1 — Local Tools (Your Machine)

Runs manually or on save. Catches problems before they ever reach Git.

| Tool | What it does | Command |
|------|-------------|---------|
| ESLint + `eslint-plugin-security` | Finds insecure code patterns (e.g. `eval`, regex injection) | `npm run lint` |
| secretlint | Scans every file for secrets — AWS keys, tokens, passwords | `npm run secretlint` |
| audit-ci | Checks all npm dependencies for known CVEs (blocks on HIGH+) | `npm run audit:check` |

```bash
npm run lint          # Check code quality and security rules
npm run secretlint    # Scan for accidentally included secrets
npm run audit:check   # Check dependencies for vulnerabilities
```

---

### Layer 2 — Git Hooks (Every Commit & Push)

Powered by **Husky** + **lint-staged**. Runs automatically — you cannot commit or push without passing these checks.

| Hook | Trigger | What runs |
|------|---------|-----------|
| `pre-commit` | Every `git commit` | lint-staged → ESLint + secretlint on staged files only |
| `pre-push` | Every `git push` | gitleaks secret scan across the entire repo |

**How it works:**
```
git commit -m "add feature"
  → lint-staged runs ESLint on changed .ts files
  → secretlint scans staged files for secrets
  → If anything fails → commit is BLOCKED
  → Fix the issue, then commit again
```

If gitleaks is not installed locally, the pre-push hook skips with a warning. Install it for full protection: [gitleaks.github.io](https://github.com/gitleaks/gitleaks#installing)

---

### Layer 3 — Pull Request Review (GitHub)

Protects the `main` branch. Nobody — including the repo owner — can push directly to `main`. All changes must go through a Pull Request.

**Setup (one-time):**

Go to `Settings → Branches → Add branch ruleset` on GitHub and configure:

- Branch: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (add: `CI / Test`, `CI / CodeQL analysis`, `CI / Trivy`, `CI / Security scan`)
- ✅ Require at least 1 approval

**CODEOWNERS** (`.github/CODEOWNERS`):

Defines who must review which part of the codebase. In a 3-person team:

```
# All files require review from the security lead
* @JohnnySR605

# CI/CD workflow changes require review from all leads
.github/workflows/ @JohnnySR605 @teammate2 @teammate3

# Source code requires review from at least one dev
src/ @JohnnySR605 @teammate2
```

This means if anyone on the team (or an outside contributor) submits a PR that touches `src/`, at least one listed owner must approve before it can merge.

---

### Layer 4 — CI/CD Pipeline (Every Push & PR)

Runs automatically on GitHub Actions on every push and pull request. Four jobs run in parallel:

```
push / PR
    ├── test (Node 18.x)   → lint + secretlint + audit + build
    ├── test (Node 20.x)   → same as above
    ├── test (Node 22.x)   → same as above
    ├── security           → Snyk (dependency CVEs) + Semgrep (SAST)
    ├── codeql             → GitHub CodeQL deep code analysis
    └── trivy              → Docker image vulnerability scan
```

**Required GitHub Secrets** (`Settings → Secrets and variables → Actions`):

| Secret | Where to get it |
|--------|----------------|
| `SNYK_TOKEN` | [app.snyk.io](https://app.snyk.io) → Account settings |
| `SEMGREP_APP_TOKEN` | [semgrep.dev](https://semgrep.dev) → Settings |

`GITHUB_TOKEN` is provided automatically — no setup needed.

**What each tool catches:**

- **Snyk** — known CVEs in your `package.json` dependencies, blocks on HIGH severity
- **Semgrep** — SAST rules for Node.js/TypeScript: injection, hardcoded secrets, insecure patterns
- **CodeQL** — GitHub's deep semantic analysis, finds logic-level security bugs
- **Trivy** — scans the built Docker image for OS-level and library vulnerabilities before it ever reaches production

Results from CodeQL and Trivy appear in the **Security → Code scanning** tab on GitHub.

---

### Layer 5 — Runtime Protection (Production)

Built into `src/index.ts`. Runs in production on every request.

| Protection | Tool | What it does |
|-----------|------|-------------|
| HTTP security headers | Helmet | Sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. |
| Rate limiting (global) | express-rate-limit | Max 100 requests per 15 minutes per IP |
| Rate limiting (auth routes) | express-rate-limit | Max 10 requests per 15 minutes on sensitive endpoints |
| Input validation | Zod | Validates and sanitizes all request bodies with typed schemas |
| Request logging | Morgan + Winston | Logs all requests with IP, method, path, status code |
| Body size limit | Express | Rejects bodies larger than 10kb |
| Error handling | Custom middleware | Never exposes stack traces or internal errors to clients |

**Verify it's working:**

```bash
# Check security headers
curl -I http://localhost:3000/health
# Should see: X-Frame-Options, Strict-Transport-Security, Content-Security-Policy, etc.

# Test rate limiter (after 100 requests you get 429)
# Run 110 requests — requests 99+ return {"error":"Too many requests..."}
```

---

## Applying to Your Own Project

Copy these files into any Node.js project:

```
.github/
  workflows/ci.yml      # Full CI/CD pipeline
  CODEOWNERS            # PR review assignments
.husky/
  pre-commit            # Commit hook
  pre-push              # Push hook
.eslintrc.json          # ESLint + security rules
.secretlintrc.json      # Secret scanning config
.secretlintignore       # Files excluded from secret scan
.hadolint.yaml          # Dockerfile linting
.gitignore              # Excludes node_modules, dist, logs, .env
.env.example            # Template for required environment variables
```

Then add these devDependencies from `package.json` and run `npm install`:

```json
"husky", "lint-staged", "eslint", "@typescript-eslint/eslint-plugin",
"eslint-plugin-security", "secretlint", "@secretlint/secretlint-rule-preset-recommend",
"audit-ci"
```

Husky hooks activate automatically on `npm install` via the `prepare` script.

---

## Team Workflow (3 developers)

```
Developer A                Developer B / C           Protected main branch
     │                           │                           │
     ├─ git commit               │                           │
     │   └─ pre-commit hook      │                           │
     │       ├─ ESLint ✓         │                           │
     │       └─ secretlint ✓     │                           │
     │                           │                           │
     ├─ git push                 │                           │
     │   └─ pre-push hook        │                           │
     │       └─ gitleaks ✓       │                           │
     │                           │                           │
     ├─ Open Pull Request ──────────────────────────────────►│
     │                           │                CI runs:   │
     │                           │                ├─ lint    │
     │                           │                ├─ Snyk    │
     │                           │                ├─ CodeQL  │
     │                           │                └─ Trivy   │
     │                           │                           │
     │                    Review & Approve ─────────────────►│
     │                    (CODEOWNERS required)              │
     │                                                       │
     └───────────────────────── Merge only if all checks ✓ ──┘
```

No one can merge to `main` unless:
1. All CI checks pass
2. At least one CODEOWNER has approved the PR

---

## Useful Commands

```bash
npm run dev           # Start development server (ts-node)
npm run build         # Compile TypeScript to dist/
npm run start         # Run compiled production build
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run secretlint    # Scan for secrets
npm run audit:check   # Check for vulnerable dependencies
docker compose up     # Run with Docker
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window per IP |

Copy `.env.example` to `.env` and fill in values before running.
