# Contributing to Dashbored

Thanks for contributing. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

1. Install Bun and Docker.
2. Copy `.env.example` to a private `.env` file and replace every placeholder.
3. Start PostgreSQL with `docker compose up -d postgres`.
4. Install dependencies with `bun install`.
5. Run `bun run db:migrate`, `bun run db:seed`, and `bun run dev`.

Run the worker separately with `bun run worker` when working on polling or service integrations.

## Before opening a pull request

Run the applicable checks locally:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Keep changes focused, add or update tests when behavior changes, and document user-visible changes. Do not commit `.env` files, credentials, private service URLs, database exports, or generated build output.

## Pull requests

Explain the problem, the approach, and how you tested it. For interface changes, include screenshots or a short recording. Maintainers may ask for revisions to preserve security, accessibility, and a coherent product direction.

## Issues

Use the issue templates for bugs and feature requests. Security-sensitive reports belong in the private process described in [SECURITY.md](SECURITY.md).
