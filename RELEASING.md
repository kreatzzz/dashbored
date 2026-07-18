# Releasing Dashbored

This checklist produces an auditable container release. It intentionally requires a reviewed Git tag; publishing a package is never triggered by an ordinary branch push.

## Prerequisites

- `main` is green in GitHub Actions.
- The version in `package.json` and `CHANGELOG.md` has been reviewed.
- A release image can be built locally or by CI.
- GitHub Actions is allowed to write packages for this repository.

## Create a release

1. Run the required checks:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
docker compose config --quiet
```

2. Update `package.json`, `CHANGELOG.md`, and user-facing docs for the release version.
3. Commit the release preparation on `main`.
4. Create and push an annotated semantic version tag:

```bash
git tag -a v0.1.0 -m "Dashbored v0.1.0"
git push origin v0.1.0
```

5. The **Publish container image** workflow builds `linux/amd64` and `linux/arm64` images, produces an SBOM, and uploads a provenance attestation. Wait for it to complete before announcing the release.
6. Open the resulting GHCR package once and verify that its visibility is public if the release is intended for public use.
7. Verify the published image:

```bash
gh attestation verify oci://ghcr.io/kreatzzz/dashbored:0.1.0 --repo kreatzzz/dashbored
```

8. Create the GitHub Release from the tag, using the corresponding `CHANGELOG.md` section as its notes.

## Never include

Do not put `.env` values, database dumps, real upstream URLs, credentials, personal backups, or server-specific screenshots in a release artifact, container image, issue, or release note.
