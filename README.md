# Dashbored

Dashbored is a self-hosted dashboard for monitoring and operating the services you run. It combines status, metrics, history, launch links, and carefully scoped service actions in one focused interface.

## Features

- Service adapters for Beszel, Portainer, AdGuard Home, Uptime Kuma, and Servarr-compatible services.
- Encrypted storage for service credentials.
- A polling worker that records health and chart history.
- Passkey-capable authentication, with a bootstrap owner for first-run setup.
- A Docker Compose stack that keeps PostgreSQL off the host network by default.

## Quick start with Docker

Start PostgreSQL, migrations, the dashboard, and the polling worker together:

```bash
bun run docker:local
```

Open `http://localhost:43821`. On first run, the helper creates an ignored, permission-restricted `.env.docker.local` containing randomly generated local credentials and keys. PostgreSQL is not published to the host, and the dashboard binds to `127.0.0.1`.

Useful commands:

```bash
bun run docker:local:status
bun run docker:local:logs
bun run docker:local:down
```

Stopping the stack preserves the PostgreSQL volume. `docker:local:down` does not delete dashboard data.

## Native development

1. Copy `.env.example` to `.env` and replace every placeholder with a unique value.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Run `bun run db:migrate`, then `bun run db:seed`.
4. Start the app with `bun run dev:portless`.
5. Start the polling worker in another terminal with `bun run worker`.

Portless assigns a free internal port; no application port needs to be chosen locally.

## Connect services

The dashboard and worker make upstream requests from their own runtime. Enter a URL reachable from that runtime; in Docker, `localhost` means the Dashbored container, not another service. Use least-privileged credentials and a private network or trusted proxy for administrative services.

1. Sign in and open **Settings**.
2. Edit a service, select its adapter, and enter its reachable URL.
3. Add only the credentials required by that adapter.
4. Keep the worker running and wait for the next polling interval.

If an upstream service uses a self-signed certificate, prefer a hostname with a certificate trusted by the Dashbored host. Do not disable TLS verification globally.

## Deployment

Copy `.env.example` to a private `.env` file on the deployment host, replace all placeholders, and configure a stable public `BETTER_AUTH_URL` plus trusted origins. The Compose stack publishes only the dashboard; PostgreSQL stays on its private Compose network.

By default the dashboard binds to loopback. Put it behind a TLS-terminating reverse proxy, or explicitly set `DASHBOARD_BIND_ADDRESS` only after reviewing the exposure and firewall rules for your environment.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull-request guidance. Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Dashbored is licensed under the [GNU Affero General Public License v3.0](LICENSE).
