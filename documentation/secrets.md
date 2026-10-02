# Secrets (sops + age)

All secret values live encrypted in `secrets/*.enc.*`, committed to git. Plaintext
`.env*` files are materialized locally via just and never committed. One shared age
key encrypts everything - no per-person keys.

## Layout

| Committed (ciphertext)    | Decrypts to (gitignored)      | Used by                                |
| ------------------------- | ----------------------------- | -------------------------------------- |
| `secrets/local.enc.env`   | `.env`                        | Next.js dev server, Prisma CLI, Vitest |
| `secrets/dev.enc.env`     | `.env.dev`                    | `just dev-*` (dev compose infra)       |
| `secrets/prod.enc.env`    | `.env.prod`                   | `just prod-*` (prod compose infra+app) |
| `secrets/staging.enc.env` | `.env.staging`                | Vercel testing project (copy-paste)    |
| `secrets/extra.enc.yaml`  | `secrets/release-bot.pem` etc | Release tooling, OAuth client JSON     |

`.sops.yaml` holds only the age **public** key (`age1…`). The private key lives at
`~/.config/sops/age/keys.txt` and must never enter git (`.gitignore` bans `keys.txt`).

File naming follows the sops convention: `.enc` goes **before** the real extension
(`prod.enc.env`, not `.env.prod.enc`) so sops infers the dotenv/YAML format and no
`--input-type` flags are ever needed.

## Onboarding (new machine)

Works anywhere `just` + `sops` + `age` exist - Nix provides them ([Getting Started](./getting-started.md#choose-your-setup)).

```bash
direnv allow  # Nix only; skip if you installed just + sops + age manually

# 1. Install the shared age private key (sent once via an existing secure channel)
mkdir -p ~/.config/sops/age
# paste the AGE-SECRET-KEY-… line into ~/.config/sops/age/keys.txt, then:
chmod 600 ~/.config/sops/age/keys.txt

# 2. Materialize plaintext
just secrets-decrypt

# 3. Sanity check
just secrets-status
```

Without the key, use the `.env.*.example` templates instead (`cp .env.example .env`
…). You get a working local boot with dummy values, but not the real shared secrets.

## Daily use

```bash
just secrets-decrypt      # refresh all plaintext from ciphertext
just secrets-edit-prod    # edit prod secrets in place (also -local/-dev/-staging/-extra)
just secrets-status       # verify key works and everything decrypts
```

`sops <file>` works directly too - the `just secrets-edit-*` targets are just
shortcuts so nobody memorizes filenames. `git diff` on encrypted files shows
decrypted values (via `.gitattributes` + `diff.sops.textconv`); enable it once with:

```bash
git config diff.sops.textconv "sops decrypt"
```

Notes:

- sops normalizes dotenv files on decrypt (blank lines are dropped). Values and
  comments are preserved - this is cosmetic, not data loss.
- Never edit `.env*` to share a change - edit the `secrets/*.enc.*` source with
  `sops`/`just secrets-edit-*` and commit the ciphertext so everyone gets it via
  `just secrets-decrypt`.

## Deploying secrets

- **Self-hosted docker:** decrypt locally, copy the plaintext to the server
  (`scp .env.prod <host>:…`). The age key never leaves your machine.
- **Vercel:** `sops decrypt secrets/staging.enc.env`, paste values into the project
  dashboard (Settings → Environment Variables). Nothing to install on Vercel.
- **One-shot without writing files:** `sops exec-env secrets/prod.enc.env 'just prod-up'`.

## Key management

- **Backup:** keep one copy of the `AGE-SECRET-KEY-…` line in a password manager.
  Losing the key means losing all prod secrets (same as losing the SeaweedFS KEK).
- **Rotation (only if the key leaks):** generate a new key, replace the `age:` line in
  `.sops.yaml`, then `sops updatekeys secrets/*.enc.env secrets/*.enc.yaml`.
