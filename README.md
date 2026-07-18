# Dashbored

Dashbored is a self-hosted dashboard for monitoring and operating the services you run. It combines status, metrics, history, launch links, and carefully scoped service actions in one focused interface.

## v0.1 support boundary

- Portainer inventory discovery and explicitly confirmed container actions.
- Generic Launcher entries for all other private HTTP(S) services.
- Encrypted storage for service credentials.
- A polling worker that records health and chart history.
- Passkey-capable authentication, with a bootstrap owner for first-run setup.
- A Docker Compose stack that keeps PostgreSQL off the host network by default.

Beszel, AdGuard Home, Uptime Kuma, Jellyfin, Immich, and Servarr-compatible adapters are experimental while their contracts mature. See [SUPPORT.md](SUPPORT.md) for the full compatibility promise and exclusions.

## Run on a server

Create a private `.env` from `.env.example`, replace every placeholder, then
run this one command:

```bash
bun run serve
```

It builds and starts the dashboard, migration job, worker, and PostgreSQL with
Docker Compose. The dashboard defaults to `http://localhost:3010`; PostgreSQL
is not published to the host. Use `bun run status`, `bun run logs`, and
`bun run stop` to inspect, follow, or stop the stack.

## Native development

Local development does not use Docker or Portless. Install PostgreSQL 17 on
your computer, create a `dashbored` database and role, then configure the local
connection in `.env`.

```bash
createuser -P dashbored
createdb -O dashbored dashbored
bun install
cp .env.example .env
bun run db:migrate
bun run db:seed
bun run dev
```

Open `http://localhost:3010`. `bun run dev` is Next.js development mode: saved
changes use Fast Refresh immediately, with no image rebuild or container layer
involved. Run `bun run worker` in another terminal only when changing polling
or provider behavior.

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

## Back up

Create a logical PostgreSQL backup with restricted file permissions:

```bash
bun run backup
```

The command writes a compressed dump and checksum to `backups/` by default. Store the matching environment file separately in an encrypted secret manager or backup system: its `CREDENTIAL_MASTER_KEY` is required to decrypt saved service credentials after a restore.

## Releases and container images

Version tags publish signed multi-architecture images to `ghcr.io/kreatzzz/dashbored`. Releases use immutable version tags; avoid deploying `latest` in production. Verify a published image's build provenance with:

```bash
gh attestation verify oci://ghcr.io/kreatzzz/dashbored:VERSION --repo kreatzzz/dashbored
```

See [CHANGELOG.md](CHANGELOG.md) for release notes.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull-request guidance. Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Dashbored is licensed under the [GNU Affero General Public License v3.0](LICENSE).
