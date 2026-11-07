# Conecta Escola

Marketplace comunitário da **E.E VILA SÃO JOAQUIM II**: famílias encontram serviços e profissionais da própria comunidade escolar.

Tudo roda em **um único container** (site + API + banco SQLite). Os dados ficam num volume do Docker, então sobrevivem a reinícios do container e do notebook.

```
┌──────────── notebook ────────────┐
│  docker compose                  │
│  ┌────────────────────────────┐  │      celulares dos pais
│  │ conecta-escola (Node 22)   │◄─┼───── http://IP-DO-NOTEBOOK:8080
│  │  React  +  API  +  SQLite  │  │      (ou QR code na tela)
│  └─────────────┬──────────────┘  │
│        volume "dados" (/data)    │
└──────────────────────────────────┘
```

---

> **Publicar na AWS (EC2) com atualização automática pelo GitHub?** Siga o guia [PUBLICAR-NA-AWS.md](PUBLICAR-NA-AWS.md).

---

## 1. Pré-requisitos

- **Docker Desktop** (Windows/Mac) ou Docker Engine + plugin compose (Linux).
- Internet **só na primeira vez**, para baixar a imagem do Node e as dependências. No dia da apresentação o sistema roda sem internet.

## 2. Subir o sistema

```bash
cp .env.example .env          # opcional: ajuste senha do admin, porta etc.
docker compose up -d --build  # constrói e sobe em segundo plano
docker compose logs -f app    # acompanha os logs (Ctrl+C para sair)
```

Abra **http://localhost:8080**.

O container usa `restart: unless-stopped`. Se o notebook reiniciar, ele volta sozinho assim que o Docker Desktop abrir.

### Login do administrador

Na primeira subida é criado o admin:

| E-mail | Senha |
|---|---|
| `admin@conectaescola.local` | `conecta123` |

Troque a senha em **Minha conta → Trocar senha**, ou defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env` **antes** da primeira subida.

---

## 3. No dia da apresentação

### a) Descobrir o IP do notebook

| Sistema | Comando | Procure por |
|---|---|---|
| Windows | `ipconfig` | "Endereço IPv4" do Wi-Fi, ex.: `192.168.0.10` |
| Mac | `ipconfig getifaddr en0` | |
| Linux | `hostname -I` | |

### b) Projetar o QR code

No notebook, abra **http://IP-DO-NOTEBOOK:8080/qr** (use o IP, não `localhost`) e projete a tela. Os pais apontam a câmera e caem direto em **Criar conta**.

O painel de administração também tem o botão **"Abrir QR Code da apresentação"**.

### c) Aprovar os cadastros ao vivo

Entre como admin → **Administração → Cadastros** → **Aprovar**. Na hora que o cadastro é aprovado, a pessoa passa a ver os contatos e consegue pedir orçamentos.

### Se o celular não conseguir abrir o site

1. **Firewall do Windows:** na primeira execução, aceite o aviso do Windows para o Docker em redes **privadas**. Se a rede estiver marcada como "pública", mude para "privada".
2. **Wi-Fi da escola isolando os aparelhos** (muito comum). Use uma das saídas:
   - **Roteador ou hotspot próprio:** ligue o notebook e os celulares nele.
   - **Túnel público (precisa de internet):**
     ```bash
     docker compose --profile tunnel up -d
     docker compose logs tunnel | grep trycloudflare
     ```
     Pegue a URL `https://xxxx.trycloudflare.com`, abra `https://xxxx.trycloudflare.com/qr` e projete. A URL muda toda vez que o túnel reinicia.

---

## 4. Comandos úteis

```bash
docker compose ps                     # está rodando? (STATUS deve ser "healthy")
docker compose restart app            # reinicia
docker compose down                   # para (os dados continuam no volume)
docker compose up -d --build          # atualiza depois de mudar o código

# Backup do banco (pode rodar com o sistema no ar)
docker compose exec app node --disable-warning=ExperimentalWarning dist/backup.js
docker cp conecta-escola:/data/backups ./backups

# Restaurar um backup
docker compose stop app
docker cp ./backups/ARQUIVO.db conecta-escola:/data/conecta-escola.db
docker compose start app

# Esqueci a senha do admin
docker compose exec app node --disable-warning=ExperimentalWarning dist/reset-admin.js NOVA_SENHA

# APAGAR TUDO (fim do projeto, LGPD): remove container e volume com os dados
docker compose down -v
```

> **Depois da apresentação:** os dados são reais (nome, e-mail e telefone dos pais), e a página de privacidade promete que serão apagados. Combine uma data e rode `docker compose down -v`.

---

## 5. O que o sistema faz

| Rota | O quê |
|---|---|
| `/` | Página inicial com busca, categorias e profissionais aprovados |
| `/categorias` | Categorias ativas, com a contagem real de profissionais |
| `/profissionais` | Busca + filtros (categoria, escola, cidade, nota), ordenação e paginação; os filtros ficam na URL (dá para compartilhar) |
| `/profissionais/:slug` | Perfil, serviços, avaliações; WhatsApp e orçamento só para membros aprovados |
| `/parcerias` | Mural de parcerias entre profissionais aprovados |
| `/como-funciona`, `/contato`, `/privacidade` | Institucional, suporte, termos/LGPD |
| `/cadastro` | Cadastro básico: nome, e-mail, telefone, senha e aceite |
| `/entrar`, `/recuperar-senha` | Login e recuperação de senha |
| `/minha-conta` | Status do vínculo, dados, **perfil profissional + serviços**, orçamentos enviados/recebidos |
| `/admin` | Aprovação de cadastros, denúncias, avaliações, parcerias, suporte, senhas, escolas, categorias e registro de ações |
| `/qr` | Tela com QR code para projetar |

**Fluxo:** a pessoa cria a conta (status **pendente**) → o admin aprova, recusa com instrução de correção ou suspende → aprovada, ela vê contatos, pede orçamento e avalia. Para virar profissional, basta preencher **Minha conta → Sou profissional**. Uma mesma conta pode ser família e profissional.

**Recuperação de senha sem e-mail:** a pessoa pede pelo site → o pedido aparece em **Admin → Senhas** → o admin gera um link de uso único (válido por 2h) e envia pelo WhatsApp.

### Segurança, de forma resumida

- Senhas com **bcrypt**; sessão em cookie `httpOnly` assinado (JWT). O segredo é gerado na primeira subida e guardado no volume.
- Todas as permissões são checadas **na API**, não só na tela.
- Validação de todos os campos com **zod**; limite de tentativas no login, no cadastro e nos formulários.
- O telefone do profissional nunca sai da API para quem não é membro aprovado.
- Cabeçalhos de segurança com **helmet**; os logs de erro não registram o corpo das requisições.

---

## 6. Desenvolvimento (sem Docker)

Precisa de Node **22.13+** (o banco usa o módulo nativo `node:sqlite`, sem dependência compilada).

```bash
cd server && npm install && npm run dev     # API em http://localhost:3000
cd web    && npm install && npm run dev     # site em http://localhost:5173 (proxy para a API)
```

Estrutura:

```
server/src/
  db.ts       schema (migrações versionadas) + seed de escola, categorias e admin
  auth.ts     sessão, papéis (aprovado, admin) e registro de ações
  api.ts      rotas públicas, autenticação, minha conta, orçamento, avaliações, parcerias, denúncias
  admin.ts    rotas da administração
  backup.ts   backup consistente do SQLite
web/src/
  pages/      uma página por rota
  ui.tsx      componentes (cards, formulários, modal, estrelas…)
  lib.tsx     cliente da API, sessão, máscara de telefone
```

### Variáveis de ambiente (`.env`)

| Variável | Padrão | Para quê |
|---|---|---|
| `APP_PORT` | `8080` | Porta no notebook |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@conectaescola.local` / `conecta123` | Admin criado na 1ª subida |
| `SCHOOLS` | `E.E VILA SÃO JOAQUIM II` | Escolas criadas na 1ª subida (separe por `;`) |
| `SCHOOL_CITY` | `Cotia` | Cidade da escola |
| `PUBLIC_URL` | vazio | Endereço fixo para o QR code |
| `COOKIE_SECURE` | `false` | `true` só se o acesso for exclusivamente por HTTPS |
