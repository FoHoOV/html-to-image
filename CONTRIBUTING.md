# Contributing to html-to-image

Thanks for helping improve html-to-image. Before opening an issue, search the [existing issues](https://github.com/FoHoOV/html-to-image/issues). Bug reports should include a minimal reproduction, browser and operating-system versions, the html-to-image version, and the expected and actual behavior.

## Development setup

CI uses Node.js 24 and the pnpm version pinned in `package.json`. Corepack can install that exact pnpm version:

```shell
corepack enable
pnpm install
```

Create a focused branch from `master`, make the change, and add or update tests for behavior changes. Before opening a pull request, run:

```shell
pnpm lint
pnpm build
pnpm test
```

The build creates all publishable output under `dist/`:

- `dist/esm` contains the ESM bundle.
- `dist/cjs` contains the CommonJS bundle.
- `dist/browser` contains the minified UMD bundle.
- `dist/types` contains TypeScript declarations.

## Add a Changeset

Changesets records the release impact and consumer-facing release notes alongside a change. Add one for a bug fix, feature, breaking change, or any other change that should appear in a release:

```shell
pnpm changeset
```

Select `html-to-image`, choose the appropriate semantic-version bump, and write a concise summary from the consumer's point of view:

- `patch` fixes behavior without changing the public API.
- `minor` adds backward-compatible functionality.
- `major` makes a breaking API or behavior change.

Commit the generated `.changeset/*.md` file with the implementation. Do not edit `package.json`'s version or add the future release to `CHANGELOG.md` manually; the release workflow does that in the Version Packages pull request.

Documentation-only, test-only, and internal maintenance changes that do not affect the published package can omit a Changeset. Explain that choice in the pull request. Changesets deliberately is not a blocking CI check because not every repository change requires a release.

You can inspect the pending release plan at any time:

```shell
pnpm changeset:status
```

## Pull requests

A pull request should explain:

1. What problem it solves and any related issue.
2. Why the chosen behavior is correct, including compatibility tradeoffs.
3. Which tests cover the change and which commands were run.
4. What consumers need to know about API or behavior changes.
5. Whether it includes a Changeset, or why one is unnecessary.

Keep pull requests focused. CI installs with the frozen lockfile, builds every package format, and runs the browser test suite. A pull request must pass those checks before merge.

## Commit messages

Husky and commitlint enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Use a short imperative subject such as:

```text
fix: preserve dimensions after filtering
feat: add caller-owned resource cache
docs: explain changeset workflow
```

Use `!` or a `BREAKING CHANGE:` footer when a commit itself introduces a breaking change. The Changeset remains the source of truth for the release version and changelog entry.

## Release process

`master` is the stable release branch. Every pull request and every push to `master` must pass the build and test job. After a change containing a Changeset reaches `master`, the Changesets action creates or updates a Version Packages pull request. That pull request consumes pending Changesets, updates the package version, and writes `CHANGELOG.md`.

After the Version Packages pull request is reviewed and merged, the next verified `master` run executes:

```shell
pnpm release
```

That command rebuilds `dist/`, publishes the new version to npm, creates the git tag, and allows the Changesets action to create the corresponding GitHub release. Maintainers can apply and review the versioning changes locally with `pnpm version-packages`, but should normally let the action own that mutating step; use `pnpm changeset:status` for a read-only preview.

### Repository release setup

The release workflow requires the following repository configuration:

- An `NPM_TOKEN` Actions secret containing a granular npm access token that can publish the unscoped `html-to-image` package and has bypass-2FA enabled for automated publishing.
- GitHub Actions permission to write repository contents and pull requests, as declared by the release job.
- The repository setting that allows GitHub Actions to create pull requests.

Changing the GitHub repository URL does not grant npm publishing rights. The token owner must already be an npm maintainer for `html-to-image`; otherwise, choose a package name the owner is authorized to publish.

Pull requests created with the built-in `GITHUB_TOKEN` may not trigger another workflow automatically. If branch protection requires CI on the Version Packages pull request, configure the Changesets action with a fine-grained personal access token or GitHub App token that is scoped to this repository.
