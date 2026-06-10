# secure-express-api

Node.js + Express + TypeScript API with a full 5-layer security pipeline.

## Prerequisites

| Tool | Windows | macOS | Linux |
|------|---------|-------|-------|
| Node.js 22 | [nodejs.org](https://nodejs.org) | `brew install node@22` | `nvm install 22` |
| Docker | Docker Desktop | Docker Desktop | Docker Engine |
| Git | Git for Windows | `brew install git` | `apt install git` |

## Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd secure-express-api

# 2. Install dependencies (also installs Husky hooks automatically)
npm install

# 3. Copy environment file
cp .env.example .env
# Then fill in real values in .env

# 4. Run in development
npm run dev

# 5. Or run with Docker
docker compose up
```

## Security Layers

| Layer | What it does | When it runs |
|-------|-------------|--------------|
| 1 — Local tools | ESLint, secretlint, npm audit | Manually / on save |
| 2 — Git hooks | lint-staged + gitleaks via Husky | Every commit / push |
| 3 — PR review | Branch protection + CODEOWNERS + CodeQL | Every pull request |
| 4 — CI/CD | Full pipeline: SAST, Snyk, Trivy, CodeQL | Every push / PR |
| 5 — Runtime | Helmet, rate-limit, Zod validation, Winston | Production |

## Required GitHub Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|----------------|
| `SNYK_TOKEN` | [app.snyk.io](https://app.snyk.io) → Account settings |
| `SEMGREP_APP_TOKEN` | [semgrep.dev](https://semgrep.dev) → Settings |

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no setup needed.

## Useful commands

```bash
npm run lint          # Run ESLint
npm run secretlint    # Scan for secrets
npm run audit:check   # Check for vulnerable dependencies
npm run build         # Compile TypeScript
```

## Reusing in another project

Copy these files/folders to your project:

```
.github/workflows/security.yml
.github/CODEOWNERS
.husky/
.eslintrc.json
.secretlintrc.json
.secretlintignore
.hadolint.yaml
.gitignore
.env.example
```

Then add the devDependencies from `package.json` and run `npm install`.
