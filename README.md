# node-security-pipeline

A Node.js + Express + TypeScript API with a **5-layer security pipeline** — protecting your code from local development all the way to production.

## Security Layers

| Layer | Tools | When it runs |
|-------|-------|-------------|
| 1 — Local | ESLint, secretlint, audit-ci | Manually / on save |
| 2 — Git hooks | Husky, lint-staged, gitleaks | Every commit / push |
| 3 — PR review | Branch protection, CODEOWNERS, CodeQL | Every pull request |
| 4 — CI/CD | Snyk, Semgrep, Trivy, CodeQL | Every push / PR |
| 5 — Runtime | Helmet, rate-limit, Zod, Winston | Production |

## Getting Started

See full documentation in [`secure-express-api/repo/README.md`](secure-express-api/repo/README.md)

```bash
cd secure-express-api/repo
npm install
cp .env.example .env
npm run dev
```
