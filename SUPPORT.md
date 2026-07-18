# Dashbored support policy

Dashbored is a private, self-hosted operations console. The v0.1 support promise is intentionally narrow so installs stay predictable and security fixes can be delivered responsibly.

## Supported in v0.1

- Docker Compose deployment on a private LAN or Tailscale network.
- PostgreSQL database bundled in the provided Compose stack.
- Password authentication; passkeys when deployed at a stable private HTTPS origin.
- Portainer connection for container inventory, Launcher synchronization, and explicitly confirmed start, stop, and restart actions.
- Generic Launcher entries for private HTTP(S) application links and reachability checks.

## Experimental adapters

Beszel, AdGuard Home, Uptime Kuma, Jellyfin, Immich, and Servarr-compatible adapters may be present in the application. They are not part of the v0.1 compatibility guarantee. Their upstream APIs and response formats can change, so use them only after testing in your own environment and report sanitized compatibility results.

## Explicitly out of scope

- Direct Docker socket access or mounting `/var/run/docker.sock`.
- Internet-facing deployment without an independently hardened access layer.
- Direct Unbound control.
- Arbitrary URL proxying or public upstream services.
- Management actions for applications other than Portainer-managed containers.

## Reporting problems

For supported paths, include the Dashbored version, deployment method, redacted logs, and the relevant Portainer version. Do not include private URLs, database dumps, tokens, credentials, or unredacted screenshots. Security reports follow [SECURITY.md](SECURITY.md).
