# Publishing Guide

How to publish `eco-ai` to npm and `ecoai-python` to PyPI. Both packages use GitHub Actions for automated publishing triggered by git tags.

---

## Prerequisites

### Accounts and access
1. **npm account** — create at [npmjs.com](https://www.npmjs.com) if you don't have one.
2. **PyPI account** — create at [pypi.org](https://pypi.org) if you don't have one.
3. **GitHub repository access** — you need to be able to push tags and manage secrets.

### GitHub secrets and environments

#### For npm publishing
Add a secret named `NPM_TOKEN` to the `ecoai` GitHub repository:
1. Go to npmjs.com → your avatar → **Access Tokens** → **Generate New Token**
2. Choose **Automation** type (bypasses 2FA for CI use)
3. Copy the token
4. Go to the GitHub repo → **Settings** → **Secrets and variables** → **Actions**
5. Click **New repository secret** → name: `NPM_TOKEN` → paste the token

#### For PyPI publishing (trusted publishing — no token needed)
PyPI trusted publishing uses OIDC. The Python SDK's workflow is already configured for this, but you need to register the trust relationship on PyPI:

1. Go to [pypi.org](https://pypi.org) → log in → your username → **Your projects** → **ecoai-python** (create the project first if it doesn't exist by doing a manual publish, see below)
2. Click **Manage** → **Publishing** → **Add a new publisher**
3. Fill in:
   - **PyPI project name**: `ecoai-python`
   - **Owner**: your GitHub org/username (e.g. `HassanRasoo98`)
   - **Repository name**: `ecoai-python`
   - **Workflow name**: `ci.yml`
   - **Environment name**: `pypi`
4. Click **Add**

Also create the `pypi` environment in GitHub:
- Go to GitHub repo (`ecoai-python`) → **Settings** → **Environments** → **New environment**
- Name: `pypi`
- Optionally add protection rules (e.g. require manual approval)

---

## Publishing the npm package

### Via GitHub Actions (recommended)

The workflow in `.github/workflows/publish-npm.yml` triggers on any tag matching `sdk-js/v*`.

**Step 1 — Bump the version**

Edit `packages/sdk-js/package.json`:
```json
{
  "version": "0.2.0"
}
```

**Step 2 — Commit and push**
```bash
git add packages/sdk-js/package.json
git commit -m "chore: bump sdk-js to v0.2.0"
git push origin master
```

**Step 3 — Tag and push**
```bash
git tag sdk-js/v0.2.0
git push origin sdk-js/v0.2.0
```

The workflow will:
1. Install dependencies
2. Run `pnpm test` (fails the publish if tests fail)
3. Run `pnpm build`
4. Run `pnpm publish --access public` using `NPM_TOKEN`

Monitor the run at: `https://github.com/HassanRasoo98/ecoai/actions`

### Manual publish (without GitHub Actions)

If you need to publish directly from your machine:

```bash
# 1. Make sure you're logged in
npm login

# 2. Build and test
export PATH="/home/hassan-rasool/.nvm/versions/node/v20.20.2/bin:$PATH"
cd /path/to/ecoai
pnpm install
pnpm build
pnpm test

# 3. Publish from the sdk-js package directory
cd packages/sdk-js
npm publish --access public
```

### Verifying the publish

```bash
# Check the published version
npm view eco-ai version

# Install and test in a fresh project
mkdir /tmp/test-ecoai && cd /tmp/test-ecoai
npm init -y
npm install eco-ai openai
node -e "const { EcoAI } = require('eco-ai'); console.log('ok', typeof EcoAI)"
```

---

## Publishing the Python package

### Via GitHub Actions (recommended)

The workflow in `.github/workflows/ci.yml` triggers on tags matching `v*` (any `v`-prefixed tag).

**Step 1 — Bump the version**

Edit `pyproject.toml` in the `ecoai-python` repo:
```toml
[project]
version = "0.2.0"
```

Also update `src/ecoai/__init__.py`:
```python
__version__ = "0.2.0"
```

**Step 2 — Commit and push**
```bash
cd /path/to/ecoai-python
git add pyproject.toml src/ecoai/__init__.py
git commit -m "chore: bump version to 0.2.0"
git push origin master
```

**Step 3 — Tag and push**
```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow will:
1. Run tests on Python 3.10, 3.11, 3.12, 3.13
2. Run mypy and ruff
3. Run `uv build` (produces `dist/ecoai-0.2.0.tar.gz` and `dist/ecoai-0.2.0-py3-none-any.whl`)
4. Publish to PyPI via `pypa/gh-action-pypi-publish` using OIDC (no token stored in GitHub)

Monitor the run at: `https://github.com/HassanRasoo98/ecoai-python/actions`

### Manual publish (without GitHub Actions)

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /path/to/ecoai-python

# 1. Run tests locally first
uv run pytest
uv run mypy src/ecoai
uv run ruff check src/ecoai tests

# 2. Build the distribution packages
uv build
# creates dist/ecoai-0.2.0.tar.gz  (source distribution)
# creates dist/ecoai-0.2.0-py3-none-any.whl  (wheel)

# 3. Publish to PyPI
# Option A: using uv (prompts for API token if not set)
uv publish

# Option B: provide token directly
uv publish --token pypi-AgEIcHlwaS5vcmcA...

# Option C: using twine
pip install twine
twine upload dist/*
```

To get a PyPI API token:
1. Log in at [pypi.org](https://pypi.org)
2. Your account → **Account settings** → **API tokens** → **Add API token**
3. Scope: either "Entire account" or "Project: ecoai-python"
4. Copy the token (starts with `pypi-`)

### First-time publish (creating the project on PyPI)

The first publish creates the project. If you're using trusted publishing, do one manual publish first:

```bash
# Build
uv build

# Upload to TestPyPI first to verify everything looks right
uv publish --publish-url https://test.pypi.org/legacy/ --token test-pypi-token

# Then publish to real PyPI
uv publish --token pypi-your-token
```

### Verifying the publish

```bash
# Check the published version
pip index versions ecoai-python

# Install and test in a fresh virtualenv
python -m venv /tmp/test-ecoai-env
source /tmp/test-ecoai-env/bin/activate
pip install "ecoai-python[openai]"
python -c "from ecoai import EcoAI; print('ok', EcoAI)"
```

---

## Version policy

Both packages follow **semantic versioning** (`MAJOR.MINOR.PATCH`):

| Change | Version bump |
|---|---|
| New feature, backwards-compatible | `MINOR` (e.g. 0.1.0 → 0.2.0) |
| Breaking API change | `MAJOR` (e.g. 0.x.x → 1.0.0) |
| Bug fix, docs, internal refactor | `PATCH` (e.g. 0.1.0 → 0.1.1) |

Keep both packages in sync — if you ship `0.2.0` of the npm SDK, ship `0.2.0` of the Python SDK in the same release cycle.

---

## Pre-publish checklist

Before pushing a tag, verify:

```bash
# JS SDK
cd packages/sdk-js
pnpm build && pnpm test && pnpm typecheck
# Check package.json version is correct
grep '"version"' package.json

# Python SDK
uv run pytest
uv run mypy src/ecoai
uv run ruff check src/ecoai tests
uv build
# Check wheel was created
ls dist/
# Check pyproject.toml version is correct
grep '^version' pyproject.toml
```

- [ ] All tests pass
- [ ] Type checks clean
- [ ] Lint clean
- [ ] `CHANGELOG` or commit message written
- [ ] Version bumped in `package.json` / `pyproject.toml` and `__init__.py`
- [ ] `NPM_TOKEN` secret is set (for npm)
- [ ] PyPI trusted publisher is configured (for PyPI)
- [ ] Tag pushed to GitHub
