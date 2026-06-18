# ScreenFlow Recorder — Guia de Setup

## Pré-requisitos

- Node.js 20+
- pnpm 11+ (`npm install -g pnpm`)
- Conta [Supabase](https://supabase.com) (gratuita)
- Conta [Stripe](https://stripe.com) (live mode configurado)
- Conta [Vercel](https://vercel.com) (gratuita)
- Conta [Google Cloud](https://console.cloud.google.com) (OAuth para Drive)
- Conta [Deepgram](https://console.deepgram.com) (transcrição pt-BR)

---

## 1. Clone e instale dependências

```bash
git clone https://github.com/octaviomemoria/PluginGravaTelaScreenFlow.git
cd PluginGravaTelaScreenFlow/screenflow-recorder
pnpm install
```

---

## 2. Configure o Supabase

### 2a. Crie o projeto
1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Anote: **Project URL**, **anon key**, **service_role key**
3. Vá em **Settings → Database** e copie:
   - **Transaction Pooler** (porta 6543) → `DATABASE_URL`
   - **Connection string direta** (porta 5432) → `DIRECT_URL`

> **Atenção:** O Vercel usa IPv4. A conexão direta do Supabase é IPv6-only e **não funciona no Vercel**. Use sempre o **Transaction Pooler** (`aws-1-us-east-1.pooler.supabase.com:6543`) para `DATABASE_URL`.

### 2b. Configure Auth
Em **Authentication → Providers**:
- Habilite **Email/Password**

> **Nota:** Google Drive é configurado via nosso próprio OAuth (não via Supabase). Não ative Google Provider no Supabase.

---

## 3. Configure o banco de dados

Copie e preencha o arquivo de variáveis:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Preencha as variáveis Supabase e de banco em `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.SEU_PROJETO:SENHA@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:SENHA@db.SEU_PROJETO.supabase.co:5432/postgres
```

Aplique o schema (este projeto usa `db push`, não migrations versionadas — o banco foi criado direto no Supabase):
```bash
cd apps/web
pnpm prisma db push
pnpm prisma generate
```

Para marcar o admin (após o primeiro login — o registro precisa existir):
```bash
pnpm prisma db seed        # marca octacm@gmail.com como isAdmin
```
Ou manualmente via SQL (a tabela é `users`, com `@@map`):
```sql
UPDATE users SET "isAdmin" = true WHERE email = 'octacm@gmail.com';
```

---

## 4. Configure o Google OAuth (para Google Drive)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie ou selecione um projeto → **APIs e Serviços → Credenciais**
3. Crie **ID do cliente OAuth 2.0** (tipo: Aplicativo da Web)
4. Adicione URIs de redirecionamento autorizados:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://SEU_DOMINIO.vercel.app/api/auth/google/callback`
5. Ative a **Google Drive API** no projeto
6. Copie Client ID e Client Secret para o `.env.local`:

```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

> **Modo Produção:** Se o app estiver em **"Em produção"** no OAuth consent screen, qualquer conta Google pode usar. Se ainda estiver em "Testing", adicione os emails de teste em **Público-alvo → Adicionar usuários**.

> Os usuários conectam o próprio Drive em **Configurações → Conta**. Os vídeos ficam em uma pasta "ScreenFlow" no Drive deles. O app só acessa arquivos que ele mesmo criou (scope `drive.file`).

---

## 5. Configure o Deepgram (transcrição)

1. Crie conta em [console.deepgram.com](https://console.deepgram.com)
2. Gere uma **API Key**
3. O modelo usado é **Nova-2** com `language=pt-BR`

```env
DEEPGRAM_API_KEY=sua-api-key
```

> Custo estimado: ~R$ 1,43/hora de áudio transcrito. Disponível apenas nos planos Pro e Business.

---

## 6. Configure o Stripe

1. Acesse [stripe.com](https://stripe.com) → **Dashboard**
2. Crie dois **Produtos** com preço recorrente mensal:
   - **ScreenFlow Pro** — R$ 49/mês → copie o Price ID
   - **ScreenFlow Business** — R$ 99/mês → copie o Price ID
3. Copie a **Secret Key** e a **Publishable Key** (live mode)

```env
STRIPE_SECRET_KEY=rk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Webhook local (para desenvolvimento)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copie o webhook secret exibido:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Webhook em produção
No painel Stripe → **Developers → Webhooks → Add endpoint**:
- URL: `https://SEU_DOMINIO.vercel.app/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copie o **Signing secret** e configure no Vercel como `STRIPE_WEBHOOK_SECRET`

---

## 7. Rodando localmente

```bash
# Na raiz do monorepo
pnpm dev
```

Isso sobe:
- Web app: http://localhost:3000

Build da extensão para teste local:
```bash
pnpm --filter @screenflow/extension build
```

---

## 8. Instale a extensão Chrome localmente

1. Faça o build: `pnpm --filter @screenflow/extension build`
2. Abra Chrome → `chrome://extensions/`
3. Ative **Modo do desenvolvedor** (canto superior direito)
4. Clique **Carregar sem compactação** → selecione `apps/extension/dist/`
5. Fixe a extensão na barra clicando no 🧩 → 📌

**Antes de gravar:**
1. Acesse o dashboard em `http://localhost:3000`
2. Faça login (cria a conta automaticamente no banco)
3. Vá em **Configurações → Conta** → **Conectar Google Drive**
4. Clique no ícone da extensão — o token é transferido automaticamente

---

## 9. Deploy no Vercel

O deploy é feito via **integração com GitHub** (não via `vercel --prod` direto, pois o monorepo exige o builder do Vercel).

### 9a. Conectar repositório

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `PluginGravaTelaScreenFlow`
3. Na configuração do projeto, defina:
   - **Root Directory:** `screenflow-recorder/apps/web`
   - **Framework Preset:** Next.js

### 9b. Configurar variáveis de ambiente

No painel Vercel → **Settings → Environment Variables**, adicione todas as variáveis de `apps/web/.env.local`, substituindo os valores de desenvolvimento pelos de produção:

| Variável | Observação |
|---|---|
| `DATABASE_URL` | Use o pooler (`aws-1-us-east-1.pooler.supabase.com:6543`) |
| `NEXT_PUBLIC_APP_URL` | URL de produção do Vercel |
| `STRIPE_WEBHOOK_SECRET` | Obtido após criar o webhook no Stripe dashboard |

### 9c. Fazer deploy

Push na branch `main` dispara o deploy automaticamente:
```bash
git push origin main
```

Para forçar um redeploy sem mudanças:
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

## 10. Configurar admin

Após o primeiro login com `octacm@gmail.com` em produção:

```sql
-- Executar no Supabase SQL Editor ou via Prisma Studio (a tabela é `users`)
UPDATE users SET "isAdmin" = true WHERE email = 'octacm@gmail.com';
```

> **Observação:** o acesso ao `/admin` também funciona pela verificação direta do e-mail (`octacm@gmail.com`) no layout, então a área já é acessível antes mesmo do `isAdmin` ser marcado no banco. O flag `isAdmin` é o que permite cadastrar **outros** admins no futuro.

Acesse `/admin` no app para verificar.

---

## 11. Checklist de verificação MVP

- [ ] `pnpm build` passa sem erros TypeScript
- [ ] Extensão instala e aparece no Chrome
- [ ] Login/signup com email funciona
- [ ] Conectar Google Drive em Configurações → Conta funciona
- [ ] Gravação de tela inicia após countdown 3s
- [ ] Barra flutuante aparece durante a gravação
- [ ] Vídeo aparece na pasta "ScreenFlow" no Google Drive do usuário
- [ ] Upload completa e gera link compartilhável
- [ ] Página pública `/p/[id]` reproduz o vídeo
- [ ] Dashboard lista os vídeos com barra de uso mensal
- [ ] Plano FREE: limite de 4h/mês e marca d'água ativa
- [ ] Pausar e retomar mantém o timer acumulado
- [ ] Popup reaberto após upload mostra "Vídeo pronto!" com link
- [ ] Checkout Stripe abre corretamente
- [ ] Webhook Stripe atualiza plano após pagamento
- [ ] Transcrição funciona no plano Pro (requer Deepgram)
- [ ] Área admin `/admin` acessível apenas com octacm@gmail.com
- [ ] Deploy no Vercel funciona

---

## Planos e preços

| Plano    | Gravação    | Transcrição | Links      | Marca d'água | Preço     |
|----------|-------------|-------------|------------|--------------|-----------|
| FREE     | 4h/mês      | 1h/mês      | 7 dias     | Sim          | Grátis    |
| PRO      | 30h/mês     | 5h/mês      | Permanente | Não          | R$49/mês  |
| BUSINESS | 120h/mês    | 10h/mês     | Permanente | Não          | R$99/mês  |

**Overage (PRO e BUSINESS):** R$0,40/minuto extra (implementação futura).

**Armazenamento:** 100% no Google Drive do próprio cliente — custo zero de storage para o SaaS.

---

## Estrutura do projeto

```
screenflow-recorder/
  apps/
    extension/     # Chrome Extension MV3 (React, Vite, @crxjs/vite-plugin)
    web/           # Next.js 15 App Router (Supabase, Prisma, Stripe, Deepgram)
  packages/
    shared/        # Tipos, limites de planos e utils compartilhados
```

---

## Scripts úteis

```bash
# Instalar dependências
pnpm install

# Dev (web + shared)
pnpm dev

# Build completo
pnpm build

# Type check
pnpm type-check

# Build extensão
pnpm --filter @screenflow/extension build

# Prisma
pnpm --filter web exec prisma migrate dev
pnpm --filter web exec prisma db push
pnpm --filter web exec prisma studio

# Gerar ícones da extensão
node apps/extension/generate-icons.js
```

---

## IDs e recursos de produção

| Serviço | ID / Referência |
|---|---|
| Supabase Project | `daddapoynmahpkjeiqmt` |
| Vercel Project ID | `prj_lMeB0cBAhvkbmpx8zXVw9yvQ50wx` |
| Google OAuth Client | `218934268776-74eo5i8jb2g2evs4uitd35bbo6p9r3mt` |
| Stripe Pro Price | `price_1TfPXKGn4WD0VixUnxL57zAx` |
| Stripe Business Price | `price_1TfPYuGn4WD0VixUwFfhpT2H` |
| URL de produção | `https://plugin-grava-tela-screen-flow-exten.vercel.app` |
| Repositório GitHub | `https://github.com/octaviomemoria/PluginGravaTelaScreenFlow` |

---

*Atualizado em 18 de junho de 2026.*
