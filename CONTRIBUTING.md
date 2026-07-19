# Contributing

## Quickstart

```bash
git clone https://github.com/four4Bytes/law-firm-management-system.git
cd law-firm-management-system
pnpm install
cp .env.dev.example .env.dev
# Fill in: AUTH_SECRET, AUTH_GOOGLE_ID/SECRET, DEVELOPER_EMAILS, APP_ORIGIN, EMAIL_FROM
make dev  # starts infra + migrates + dev server (blocking)

# In another terminal, seed if needed:
pnpm prisma:seed
```

See [documentation/getting-started.md](./documentation/getting-started.md) for detailed setup instructions.

## Reporting Issues

- Check existing issues before opening a new one.
- Provide steps to reproduce, expected vs actual behavior, and environment details.
- Include relevant logs or screenshots.

## Pull Requests

1. Work on the `dev` branch or a feature branch off `dev`.
2. Ensure tests pass: `pnpm validate && pnpm test`.
3. Keep changes focused — one logical change per PR.
4. Write clear commit messages following conventional commits.
5. Open a PR from your branch → `dev`.
6. [CodeRabbit](https://coderabbit.ai) auto-reviews the PR for logic, security, and style issues. Address its findings.
7. A maintainer does a final human review. Address feedback promptly.

## Code Review

- All PRs must pass CI (`build` → `validate` → `test`) and CodeRabbit review before merging.
- Human reviewers check for correctness, test coverage, and project conventions (see [AGENTS.md](./AGENTS.md)).
- Once approved, the author merges into `dev`.

## Full Documentation

| Topic                          | Location                                                 |
| ------------------------------ | -------------------------------------------------------- |
| Prerequisites & dev setup      | [getting-started.md](./documentation/getting-started.md) |
| Architecture & tech stack      | [architecture.md](./documentation/architecture.md)       |
| Domain model, RBAC, workflows  | [specification.md](./documentation/specification.md)     |
| Deployment & operations        | [deployment.md](./documentation/deployment.md)           |
| Conventions & coding standards | [AGENTS.md](./AGENTS.md)                                 |
