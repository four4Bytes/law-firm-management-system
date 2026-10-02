# Developer Environment Setup

Use this on Windows (inside WSL2) or natively on Linux/macOS. It gives you the pinned toolchain (Node, pnpm, just, sops, age) with no manual installs.

## 1. Install WSL2 + Arch (Windows only)

Skip this on native Linux/macOS - continue at [Docker](#2-docker).

Arch is recommended for development, but any distro works - the rest of this guide is the same either way. In PowerShell:

```powershell
wsl --install archlinux
```

This enables WSL2 and installs Arch Linux ([official image](https://wiki.archlinux.org/title/WSL)). Plain `wsl --install` gives you the default (Ubuntu) instead. Restart if asked, then check from PowerShell:

```bash
wsl -l -v
```

Full steps: [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

## 2. Docker

On Windows install [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) and enable WSL integration (Settings → Resources → WSL integration → enable archlinux, or whichever distro you installed). Everything below runs inside the Linux shell, not PowerShell. On Linux install Docker via your distro or Docker Desktop - any working `docker compose` is fine. Note the flake only provides the Docker CLI - the engine itself always comes from Desktop (Windows) or your distro (Linux).

## 3. Nix

Follow the [official instructions](https://nix.dev/install-nix) - the command differs per platform. Install `xz` first (the installer downloads a `.tar.xz` archive and fails without it):

```bash
sudo pacman -S xz   # Ubuntu/Debian: sudo apt install -y xz-utils
```

Then run the installer:

```bash
# native Linux (multi-user)
curl -L https://nixos.org/nix/install | sh -s -- --daemon

# WSL2, single-user installation (no systemd)
curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

# WSL2 with systemd support enabled, multi-user installation
curl -L https://nixos.org/nix/install | sh -s -- --daemon

# macOS
curl -L https://nixos.org/nix/install | sh
```

Flakes are off by default, so enable them:

```bash
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
```

Close and reopen the shell, then check:

```bash
nix --version
nix flake --help > /dev/null && echo "flakes OK"
```

## 4. direnv + nix-direnv

Install via your package manager (`sudo pacman -S direnv` on Arch, `sudo apt install -y direnv` on Ubuntu/Debian), or via Nix:

```bash
sudo pacman -S direnv   # or your package manager's equivalent
nix profile install nixpkgs#nix-direnv
```

Hook your shell (pick yours):

```bash
# bash
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc && source ~/.bashrc

# zsh
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc && source ~/.zshrc
```

Then wire up nix-direnv once:

```bash
mkdir -p ~/.config/direnv
echo 'source $HOME/.nix-profile/share/nix-direnv/direnvrc' >> ~/.config/direnv/direnvrc
```

Continue with [Getting Started](./getting-started.md#setup). On WSL, keep the repository under
`~/`, not `/mnt/c` - it is faster and avoids line-ending issues.
