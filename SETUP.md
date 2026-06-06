# ScreenFlow Recorder — Guia de Setup

## Pré-requisitos

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Conta [Supabase](https://supabase.com) (gratuita)
- Conta [Stripe](https://stripe.com) (gratuita para testes)
- Conta [Vercel](https://vercel.com) (gratuita)
- Conta [Google Cloud](https://console.cloud.google.com) (OAuth para Drive)
- Conta [Deepgram](https://console.deepgram.com) (transcrição pt-BR)

---

## 1. Clone e instale dependências

```bash
cd screenflow-recorder
pnpm install
```

---

## 2. Configure o Supabase

### 2a. Crie o projeto
1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Anote: **Project URL**, **anon key**, **service_role key**
3. Vá em **Settings → Database** e copie a **Connection String** (modo Transaction para `DATABASE_URL`) e a direta (para `DIRECT_URL`)

### 2b. Configure Auth
Em **Authentication → Providers**:
- Habilite **Email/Password**

> **Nota:** Google Drive é configurado via nosso próprio OAuth (não via Supabase). Não ative Google Provider no Supabase.

---

## 3. Configure o banco de dados

Copie `.env.example` para `apps/web/.env.local` e preencha as variáveis Supabase e de banco:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:SENHA@db.SEU_PROJETO.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:SENHA@db.SEU_PROJETO.supabase.co:5432/postgres
```

Execute a migration:
```bash
cd apps/web
pnpm db:generate
pnpm db:migrate
```

---

## 4. Configure o Google OAuth (para Google Drive)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto → **APIs e Serviços → Credenciais**
3. Crie **ID do cliente OAuth 2.0** (Aplicativo da Web)
4. Adicione URIs de redirecionamento autorizados:
   - Desenvolvimento: `http://localhost:3000/api/auth/google/callback`
   - Produção: `https://SEU_DOMINIO.vercel.app/api/auth/google/callback`
5. Ative a **Google Drive API** no projeto
6. Copie Client ID e Client Secret

Adicione ao `.env.local`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

> Os usuários conectam o próprio Drive em **Configurações → Conta**. Os vídeos vão para uma pasta "ScreenFlow" no Drive deles. O app só acessa arquivos que ele mesmo criou (`drive.file` scope).

---

## 5. Configure o Deepgram (transcrição)

1. Crie conta em [console.deepgram.com](https://console.deepgram.com)
2. Gere uma **API Key**
3. O modelo usado é **Nova-2** com `language=pt-BR`

Adicione ao `.env.local`:
```env
DEEPGRAM_API_KEY=your-deepgram-api-key
```

> Custo: ~R$ 1,43/hora de áudio transcrito. Disponível apenas nos planos Pro e Business.

---

## 6. Configure o Stripe

1. Acesse [stripe.com](https://stripe.com) → **Dashboard**
2. Crie dois **Produtos** com preço recorrente mensal:
   - **ScreenFlow Pro** — R$ 39/mês → copie o Price ID
   - **ScreenFlow Business** — R$ 119/mês → copie o Price ID
3. Copie a **Secret Key** e a **Publishable Key**

Adicione ao `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Webhook local (para desenvolvimento)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copie o webhook secret exibido e adicione:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 7. Rodando localmente

```bash
# Na raiz do monorepo
pnpm dev
```

Isso sobe:
- Web app: http://localhost:3000
- A extensão pode ser buildada com: `cd apps/extension && pnpm build`

---

## 8. Instale a extensão Chrome localmente

1. Faça o build: `cd apps/extension && pnpm build`
2. Abra Chrome → `chrome://extensions/`
3. Ative **Modo do desenvolvedor**
4. Clique **Carregar sem compactação** → selecione `apps/extension/dist/`
5. A extensão aparece na barra do Chrome

**Antes de gravar:** acesse o dashboard → **Configurações → Conta** e clique **Conectar Google Drive**.

---

## 9. Deploy no Vercel

```bash
npm install -g vercel
cd apps/web
vercel --prod
```

Configure todas as variáveis de ambiente no painel Vercel → **Settings → Environment Variables**.

**Importante:** Atualize `NEXT_PUBLIC_APP_URL` para o seu domínio e adicione esse domínio nas URIs de redirecionamento autorizados no Google Cloud Console.

### Webhook Stripe em produção
No painel Stripe → **Developers → Webhooks → Add endpoint**:
- URL: `https://SEU_DOMINIO.vercel.app/api/webhooks/stripe`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 10. Checklist de verificação MVP

- [ ] Extensão instala e aparece no Chrome
- [ ] Login/signup com email funciona
- [ ] Conectar Google Drive em Configurações → Conta funciona
- [ ] Gravação de tela inicia após countdown
- [ ] Vídeo aparece na pasta "ScreenFlow" no Google Drive do usuário
- [ ] Upload completa e gera link compartilhável
- [ ] Página pública `/p/[id]` reproduz o vídeo
- [ ] Dashboard lista os vídeos com barra de uso mensal
- [ ] Plano FREE mostra limite de 2h/mês e marca d'água
- [ ] Checkout Stripe abre (modo teste)
- [ ] Webhook atualiza plano após pagamento
- [ ] Transcrição funciona no plano Pro (requer Deepgram)
- [ ] Build passa: `pnpm build`
- [ ] Deploy no Vercel funciona

---

## Planos e preços

| Plano    | Gravação   | Transcrição | Links       | Marca d'água | Preço     |
|----------|-----------|-------------|-------------|--------------|-----------|
| FREE     | 2h/mês    | —           | 14 dias     | Sim          | Grátis    |
| PRO      | 20h/mês   | 3h/mês      | Permanente  | Não          | R$ 39/mês |
| BUSINESS | 160h/mês  | 15h/mês     | Permanente  | Não          | R$ 119/mês|

**Armazenamento:** 100% no Google Drive do próprio cliente (custo zero para o SaaS).

## Estrutura do projeto

```
screenflow-recorder/
  apps/
    extension/     # Chrome Extension (Manifest V3, React, Vite)
    web/           # Next.js 15 App Router + Stripe + Supabase
  packages/
    shared/        # Tipos, limites de planos e utils compartilhados
```
