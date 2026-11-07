#!/usr/bin/env bash
# Puxa as mudanças do GitHub e reconstrói o site se algo mudou.
# Roda sozinho a cada 2 minutos. Para forçar agora:  bash scripts/atualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch --quiet origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse '@{u}')
if [ "$LOCAL" = "$REMOTE" ] && [ "${1:-}" != "--forcar" ]; then
  exit 0
fi

echo "Nova versão encontrada: ${REMOTE:0:7} — atualizando…"
# A instância é um espelho do GitHub: descarta qualquer edição feita direto aqui.
# O arquivo .env (senhas) e os dados do banco NÃO são apagados.
git reset --hard --quiet '@{u}'
docker compose up -d --build
docker image prune -f >/dev/null
echo "Atualizado para ${REMOTE:0:7}."
