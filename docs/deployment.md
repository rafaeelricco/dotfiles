# Deployment

[Back to the README](../README.md) · [User setup](setup.md)

## Release flow

Every push to `main` starts [the release workflow](../.github/workflows/release.yml),
without path filters. Manual dispatch is restricted to `main`. The release ID is
the exact triggering commit SHA. The workflow builds one artifact, verifies that
same artifact on Ubuntu, macOS, and Windows, then deploys it to the VPS.

Production runs use `dotfiles-production` concurrency with `queue: max` and
`cancel-in-progress: false`. GitHub can queue up to 100 pending runs. Deployment
metadata prevents a stale rerun from replacing a newer live release.

The bundle contains tracked runtime skills, companion metadata, lifecycle scripts,
shared instructions, and the profile/theme files needed by full Windows setup.
It excludes Git metadata, credentials, caches, and user installation state.
The Bash and PowerShell bootstrap templates and short launchers are pinned to
their matching release, so an installation does not mix files from different commits.

## VPS provisioning

One-time administrative setup on `root@r1cco.com`:

1. Create `/srv/r1cco-dotfiles-runner` and install the official Linux x64 GitHub
   Actions runner there. Register it to `rafaeelricco/dotfiles` as
   `VPS-Runner-dotfiles`, using account `r1cco-runner` and the `dotfiles-deploy`
   label. Obtain a short-lived registration token through GitHub's runner API;
   do not save it in this repository or print it in logs.
2. Install/start its system service as `r1cco-runner`. Set the runner tool path to
   `/usr/local/bin:/usr/bin:/bin`. The server needs Python 3.12 or newer.
3. Give `r1cco-runner` ownership of `/var/www/r1cco.com/dotfiles`, with directories
   readable/traversable by Nginx. This runner publishes locally; CI needs no
   deployment SSH key and performs no administrative service changes.
4. Install [the Nginx snippet](../scripts/hosting/dotfiles.nginx.conf) at
   `/etc/nginx/snippets/dotfiles.conf`. Include it inside the existing HTTPS
   server block in `/etc/nginx/sites-available/r1cco.com`. Back up the site
   configuration before adding the include.
5. Validate and reload:

   ```bash
   nginx -t
   systemctl reload nginx
   ```

The runner is repository-scoped. Existing job-kit/portfolio runners cannot pick
up dotfiles jobs. It uses the existing service account; this is not a separate
security boundary from other processes using that account. Only trusted `main`
deployment jobs run here; pull-request tests use GitHub-hosted runners.

Inspect the runner from its directory:

```bash
cd /srv/r1cco-dotfiles-runner
sudo ./svc.sh status
```

## Public files and routes

Each immutable directory under `/var/www/r1cco.com/dotfiles/releases/<sha>/`
contains:

- `VERSION` and `SHA256SUMS`.
- `dotfiles-<sha>.tar.gz` and `dotfiles-<sha>.zip`, each containing `dotfiles/`.
- `install.sh`, `install.ps1`, update aliases, and uninstall launchers.
- `skills/<name>` and `skills/<name>.ps1` for packaged skill directories.

`current` is an atomic symlink to the active release. Nginx serves:

| URL                         | Content                                  |
| --------------------------- | ---------------------------------------- |
| `/dotfiles/`                | Current entrypoints and release metadata |
| `/dotfiles/releases/<sha>/` | Immutable release files                  |
| `/skills/<name>`            | Release-pinned Bash skill launcher       |
| `/skills/<name>.ps1`        | Release-pinned PowerShell skill launcher |

Unknown skill URLs return 404 instead of the portfolio's HTML fallback. Current
entrypoints must not be cached as immutable; commit-addressed files can be.
The existing `/install.sh` and `/install.ps1` job-kit redirects remain independent.
No Nginx reload is needed when publishing a later release.

## Build and publication

Build a release locally for inspection using an exact commit ID:

```bash
python3 scripts/package_release.py --version "$(git rev-parse HEAD)" --output /tmp/dotfiles-release
```

During development the explicit runtime allowlist includes new nonignored runtime
files so they can be tested before a commit. CI builds from the exact clean
checkout. The builder rejects unsupported runtime file types and creates
deterministic archives and generated launchers.

The deployment helper validates the artifact and release identity, publishes a
complete immutable directory, and switches `current` only when ordering permits.
It checks the public metadata and launchers after activation, rolling back the
pointer if smoke checks fail. An existing release cannot be replaced with
different bytes. Historical releases stay available for pinned launchers.

The workflow invokes the helper on the VPS:

```bash
python3 scripts/deploy_release.py --release /path/to/downloaded-artifact --root /var/www/r1cco.com/dotfiles --run-number 123
```

The run number comes from GitHub Actions, not an arbitrary administrator counter.
Do not use this example to bypass ordering or verification.

## Verification

Run the affected suite from the checkout:

```bash
python3 -m unittest discover -s tests
```

The native workflow also sets `DOTFILES_TEST_RELEASE_DIR` to the built public
artifact so lifecycle tests exercise those exact archive bytes. Local PowerShell
checks can use `DOTFILES_TEST_PWSH` to select an isolated runtime. HTTP fixtures use
`DOTFILES_BASE_URL`; its production default is `https://r1cco.com/dotfiles`.
Tests use disposable homes and agent stubs, never the operator's installation.

After deployment, verify the public `VERSION`, the orchestrate launcher, an unknown
skill's 404 response, and installation into a disposable user home. Recheck the
portfolio and existing job-kit installer redirects. Review all native CI results;
a passing macOS PowerShell check alone does not establish Windows Terminal behavior.

## Recovery

- Build or native-test failures leave production unchanged. Fix the failure and
  push another commit or rerun the failed current workflow.
- Publication validates staged files before activation. A failed public smoke
  check restores the previous `current` pointer and fails the workflow.
- A stale rerun may leave its immutable release available but cannot downgrade
  the current release. For an intentional code rollback, revert on `main` so a
  new verified release and run number are created.
- If Nginx configuration validation fails during one-time provisioning, restore
  the saved configuration before reloading. Later releases do not edit that config.
- If a job remains queued, inspect the repository's `dotfiles-deploy` runner and
  its service. Do not redirect the job to another repository's runner.
- User bundle failures and legacy installation migration are covered in the
  [setup guide](setup.md#state-and-migration).
