# Publicar o Conecta Escola na AWS (passo a passo)

Ao final deste guia, o site vai estar rodando numa máquina da AWS (EC2), com um endereço que qualquer pessoa consegue abrir. Toda vez que você alterar um arquivo aqui no GitHub, o site se atualiza sozinho.

```
 você edita no GitHub ──► a EC2 confere a cada 2 min ──► baixa, monta e reinicia o site
```

> **Como ler os comandos:** tudo que estiver numa caixa cinza como esta 👇 deve ser copiado e colado no terminal, seguido de **Enter**.
> ```
> exemplo de comando
> ```
> No terminal do navegador, cole com **Ctrl + Shift + V** ou com o botão direito do mouse → Colar.

---

## Parte A — Colocar o projeto no GitHub

1. Entre em **github.com** e faça login (ou crie uma conta grátis).
2. No canto superior direito, clique em **+** → **New repository**.
3. Preencha:
   - **Repository name:** `conecta-escola`
   - Marque **Public**
   - **Não** marque "Add a README file"
4. Clique em **Create repository**.
5. Na página que abrir, clique no link **uploading an existing file**.
6. No seu computador, **extraia o zip** do projeto e abra a pasta onde aparecem `Dockerfile`, `docker-compose.yml`, `server` e `web`.
7. Selecione **tudo** dentro dessa pasta (**Ctrl + A**) e **arraste** para a página do GitHub. Espere todos os arquivos carregarem.
8. Lá embaixo, clique em **Commit changes**.

✅ **Deu certo se** a página do repositório mostrar, logo de cara, `Dockerfile`, `docker-compose.yml`, `scripts`, `server` e `web`.
❌ Se aparecer só uma pasta `conecta-escola` e o resto dentro dela, você arrastou a pasta em vez do conteúdo. Apague o repositório (Settings → Delete) e refaça o passo 7.

> 🔒 **Nunca** coloque senhas no GitHub. O repositório é público, qualquer pessoa vê. A senha do site fica guardada só dentro da EC2.

---

## Parte B — Liberar as portas da EC2

A EC2 vem com tudo bloqueado. Vamos abrir duas "portas": a **80** (site, para todo mundo) e a **22** (para você entrar pelo console).

1. No console da AWS, vá em **EC2 → Instâncias** e clique na sua instância.
2. Abaixo, clique na aba **Segurança** e depois no nome do **Grupo de segurança** (começa com `sg-`).
3. Clique em **Editar regras de entrada** → **Adicionar regra**, duas vezes, e preencha:

| Tipo | Porta | Origem |
|---|---|---|
| **HTTP** | 80 | **Qualquer local-IPv4** (`0.0.0.0/0`) |
| **SSH** | 22 | Digite `instance-connect` e escolha **com.amazonaws.sa-east-1.ec2-instance-connect** |

> Se a opção `instance-connect` não aparecer, use `0.0.0.0/0` para o SSH.

4. Clique em **Salvar regras**.

---

## Parte C — Entrar na instância pelo navegador

1. Em **EC2 → Instâncias**, marque a caixinha da sua instância.
2. Clique no botão **Conectar** (lá em cima).
3. Escolha a aba **Conexão de instância do EC2** (EC2 Instance Connect). Deixe o usuário que já aparece (`ec2-user` ou `ubuntu`).
4. Clique em **Conectar**.

✅ **Deu certo se** abrir uma tela preta com algo como `[ec2-user@ip-172-31-...]$`. Esse é o terminal **dentro** da EC2.
❌ Se der erro de conexão: confira a regra de SSH da Parte B e se a instância tem **Endereço IPv4 público** (aparece nos detalhes da instância).

> O CloudShell não é mais necessário: a EC2 vai baixar o projeto direto do GitHub. Pode apagar o zip de lá.

---

## Parte D — Instalar e ligar o site

No terminal da EC2, cole um bloco de cada vez.

**1. Instalar o git** (pode aparecer um erro na primeira linha; é normal, a segunda resolve):
```
sudo dnf install -y git || sudo apt-get install -y git
```

**2. Baixar o projeto do GitHub** (troque `SEU-USUARIO` pelo seu usuário do GitHub):
```
git clone https://github.com/SEU-USUARIO/conecta-escola.git
```

**3. Entrar na pasta e rodar o instalador:**
```
cd conecta-escola
bash scripts/instalar.sh
```

O instalador faz tudo sozinho: instala o Docker, cria a senha do administrador, monta o site e liga a atualização automática. **Na primeira vez leva de 5 a 10 minutos.** Não feche a aba.

✅ **Deu certo se** no final aparecer:
```
==> PRONTO!
  Site:      http://18.231.xx.xx
  QR code:   http://18.231.xx.xx/qr
  Admin:     Login: admin@conectaescola.local
             Senha: Xy7kP2...
```
📝 **Anote a senha do admin!** Se perder, veja de novo com:
```
cat ~/senha-admin.txt
```

---

## Parte E — Testar

1. No celular ou no computador, abra o endereço do **Site** que apareceu. Use **http://**, não https://.
2. Abra o endereço do **QR code** no computador e projete na apresentação.
3. Entre como admin (botão **Entrar**) para aprovar os cadastros em **Administração → Cadastros**.

O site **continua no ar** mesmo depois que você fechar o navegador ou o terminal. Se a EC2 reiniciar, ele volta sozinho.

---

## Parte F — Alterar o site

1. No GitHub, abra o arquivo que quer mudar e clique no **lápis ✏️** (Edit).
   Exemplo: os textos da página inicial ficam em `web/src/pages/Home.tsx`.
2. Faça a alteração e clique em **Commit changes**.
3. Espere **de 3 a 7 minutos**: em até 2 minutos a EC2 percebe a mudança, e depois leva alguns minutos para montar a nova versão.
4. Recarregue o site (**F5**).

> Se você errar algo no código e o site não conseguir montar, **a versão anterior continua no ar**. Corrija no GitHub e espere de novo.

**Comandos úteis** (no terminal da EC2, dentro da pasta `conecta-escola`):

| Para… | Comando |
|---|---|
| Atualizar **agora**, sem esperar | `bash scripts/atualizar.sh` |
| Ver as atualizações acontecendo | `sudo journalctl -u conecta-atualizar -f` (sair: Ctrl + C) |
| Ver se o site está rodando | `sudo docker compose ps` |
| Ver as mensagens do site | `sudo docker compose logs app --tail 50` |
| Ver a senha do admin | `cat ~/senha-admin.txt` |
| Trocar a senha do admin | `sudo docker compose exec app node dist/reset-admin.js NovaSenha123` |

Se o terminal disser `cd: conecta-escola: No such file`, você já está dentro da pasta. Se disser que um comando não existe, rode antes: `cd ~/conecta-escola`.

---

## Parte G — Cuidados importantes

- **IP muda se a instância for parada.** Se você **parar e ligar** a EC2, o endereço muda e o QR code antigo para de funcionar. Para ter um IP fixo, peça para associar um **IP elástico** (Elastic IP).
- **Custo.** A EC2 cobra enquanto estiver ligada. Depois da apresentação, combine com o professor e **encerre a instância** (Estado da instância → Encerrar). Isso também **apaga os dados dos pais**, como promete a página de privacidade.
- **Senhas.** A senha do admin fica só na EC2 (`.env` e `~/senha-admin.txt`), nunca no GitHub.
