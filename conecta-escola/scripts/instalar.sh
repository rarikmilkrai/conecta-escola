#!/usr/bin/env bash
# Instala o Conecta Escola numa EC2 (Amazon Linux 2023 ou Ubuntu).
# Uso, de dentro da pasta do projeto:   bash scripts/instalar.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
ME="$(id -un)"
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] && { echo "Rode SEM sudo: bash scripts/instalar.sh"; exit 1; }
. /etc/os-release

# ---------- 1. Docker ----------
if ! command -v docker >/dev/null 2>&1; then
  say "Instalando o Docker (leva uns 2 minutos)"
  if [ "$ID" = "amzn" ]; then
    sudo dnf install -y docker git
    ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && BARCH=amd64 || BARCH=arm64
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$ARCH" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    BX=$(curl -fsSI https://github.com/docker/buildx/releases/latest 2>/dev/null | grep -i '^location:' | sed 's|.*/tag/||' | tr -d '\r\n' || true)
    [ -n "$BX" ] || BX=v0.17.1   # reserva: versão mínima exigida pelo compose build
    sudo curl -fsSL "https://github.com/docker/buildx/releases/download/$BX/buildx-$BX.linux-$BARCH" \
      -o /usr/local/lib/docker/cli-plugins/docker-buildx
    sudo chmod +x /usr/local/lib/docker/cli-plugins/*
  else
    curl -fsSL https://get.docker.com | sudo sh
  fi
fi
sudo systemctl enable --now docker
sudo usermod -aG docker "$ME"
sudo docker compose version >/dev/null

# ---------- 2. Memória extra (máquinas com 1 GB travam no build) ----------
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 1900 ] && ! swapon --show | grep -q .; then
  say "Criando 2 GB de memória extra (swap)"
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# ---------- 3. Configuração (.env) ----------
if [ ! -f .env ]; then
  say "Criando configuração com senha de admin aleatória"
  PASS=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12)
  cat > .env <<CFG
APP_PORT=80
ADMIN_EMAIL=admin@conectaescola.local
ADMIN_PASSWORD=$PASS
CFG
  chmod 600 .env
  printf 'Login: admin@conectaescola.local\nSenha: %s\n' "$PASS" > "$HOME/senha-admin.txt"
  chmod 600 "$HOME/senha-admin.txt"
fi

# ---------- 4. Subir o site ----------
say "Montando e ligando o site (primeira vez leva de 3 a 8 minutos)"
sudo docker compose up -d --build

# ---------- 5. Atualização automática a partir do GitHub ----------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  say "Ligando a atualização automática (confere o GitHub a cada 2 minutos)"
  sudo tee /etc/systemd/system/conecta-atualizar.service >/dev/null <<UNIT
[Unit]
Description=Conecta Escola - atualiza a partir do GitHub
After=network-online.target docker.service
[Service]
Type=oneshot
User=$ME
WorkingDirectory=$DIR
ExecStart=/bin/bash $DIR/scripts/atualizar.sh
UNIT
  sudo tee /etc/systemd/system/conecta-atualizar.timer >/dev/null <<UNIT
[Unit]
Description=Conecta Escola - confere o GitHub a cada 2 minutos
[Timer]
OnBootSec=1min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
UNIT
  sudo systemctl daemon-reload
  sudo systemctl enable --now conecta-atualizar.timer
fi

# ---------- 6. Endereço ----------
TOKEN=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null || true)
IP=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "IP-PUBLICO")

say "PRONTO!"
echo "  Site:      http://$IP"
echo "  QR code:   http://$IP/qr"
echo "  Admin:     $(sed -n 1p "$HOME/senha-admin.txt" 2>/dev/null)"
echo "             $(sed -n 2p "$HOME/senha-admin.txt" 2>/dev/null)   (guardada em ~/senha-admin.txt)"
