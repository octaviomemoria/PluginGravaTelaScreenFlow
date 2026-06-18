# ScreenFlow Recorder

Gravador de tela estilo Loom com extensão Chrome, SaaS web app, transcrição por IA e geração de ata de reunião.

**Produção:** https://plugin-grava-tela-screen-flow-exten.vercel.app  
**Repositório:** https://github.com/octaviomemoria/PluginGravaTelaScreenFlow  
**Admin:** octacm@gmail.com

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Monorepo](#estrutura-do-monorepo)
4. [Banco de Dados](#banco-de-dados)
5. [Planos e Limites](#planos-e-limites)
6. [API Reference](#api-reference)
7. [Extensão Chrome](#extensão-chrome)
8. [Área Administrativa](#área-administrativa)
9. [Variáveis de Ambiente](#variáveis-de-ambiente)
10. [Setup Local](#setup-local)
11. [Deploy](#deploy)
12. [Serviços Externos](#serviços-externos)
13. [Fluxos Principais](#fluxos-principais)
14. [Roadmap](#roadmap)

---

## Visão Geral

O ScreenFlow Recorder permite que usuários gravem sua tela e reuniões diretamente pelo navegador Chrome, façam upload automático para o Google Drive pessoal de cada usuário, gerem transcrições com Deepgram e criem atas de reunião com IA.

**Funcionalidades MVP:**
- Gravação de tela, câmera ou ambos simultaneamente (com compositing canvas)
- Upload automático para Google Drive do usuário via OAuth
- Transcrição automática com Deepgram
- Geração de ata de reunião
- Dashboard com biblioteca de vídeos
- Player de vídeo com proxy seguro
- Links compartilháveis com controle de visibilidade
- Planos FREE / PRO / BUSINESS com cobrança via Stripe
- Área de administração completa

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web App | Next.js 15 App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Extensão | Chrome MV3, React 18, TypeScript, Vite, @crxjs/vite-plugin |
| Autenticação | Supabase Auth (email/senha) |
| Banco de dados | Supabase Postgres + Prisma ORM v6 |
| Storage de vídeo | Google Drive (OAuth por usuário, upload resumable) |
| Transcrição | Deepgram API (modelo nova-2, pt-BR) |
| Pagamentos | Stripe (Checkout, Customer Portal, Webhooks) |
| Deploy | Vercel (web) + Chrome Web Store (extensão) |
| Package manager | pnpm 11 |

---

## Estrutura do Monorepo

```
screenflow-recorder/
├── apps/
│   ├── web/                          # Next.js 15 — SaaS web app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/           # Rotas públicas de autenticação
│   │   │   │   │   ├── login/
│   │   │   │   │   └── signup/
│   │   │   │   ├── (app)/            # Rotas protegidas (requer login)
│   │   │   │   │   ├── layout.tsx    # Header com nav e info do usuário
│   │   │   │   │   ├── dashboard/    # Biblioteca de vídeos
│   │   │   │   │   ├── video/[id]/   # Player e edição de vídeo
│   │   │   │   │   └── settings/
│   │   │   │   │       ├── account/  # Conectar Google Drive
│   │   │   │   │       └── billing/  # Plano e pagamento
│   │   │   │   ├── (admin)/          # Área admin (octacm@gmail.com only)
│   │   │   │   │   ├── layout.tsx    # Sidebar admin
│   │   │   │   │   └── admin/
│   │   │   │   │       ├── page.tsx         # Dashboard de métricas
│   │   │   │   │       ├── users/           # Gestão de usuários
│   │   │   │   │       ├── videos/          # Gestão de vídeos
│   │   │   │   │       ├── stats/           # Gráficos e estatísticas
│   │   │   │   │       ├── plans/           # Visão dos planos
│   │   │   │   │       └── logs/            # Logs de auditoria
│   │   │   │   ├── p/[publicId]/     # Página pública do vídeo (sem login)
│   │   │   │   ├── auth/callback/    # Callback OAuth Supabase
│   │   │   │   └── api/
│   │   │   │       ├── uploads/
│   │   │   │       │   ├── create/   # Cria sessão de upload no Drive
│   │   │   │       │   └── complete/ # Finaliza upload e salva metadados
│   │   │   │       ├── videos/
│   │   │   │       │   ├── route.ts        # GET lista / POST criar
│   │   │   │       │   └── [id]/route.ts   # GET / PATCH / DELETE
│   │   │   │       ├── me/limits/    # Limites do plano atual
│   │   │   │       ├── transcripts/[videoId]/ # Transcrição + ata
│   │   │   │       ├── auth/google/
│   │   │   │       │   ├── connect/  # Inicia OAuth Google Drive
│   │   │   │       │   ├── callback/ # Recebe code, salva tokens
│   │   │   │       │   └── disconnect/ # Remove tokens
│   │   │   │       ├── billing/
│   │   │   │       │   ├── create-checkout/ # Stripe Checkout
│   │   │   │       │   └── portal/          # Customer Portal
│   │   │   │       ├── proxy/video/[fileId]/ # Proxy de stream do Drive
│   │   │   │       ├── webhooks/stripe/      # Webhook Stripe
│   │   │   │       ├── admin/               # APIs de administração
│   │   │   │       │   ├── stats/
│   │   │   │       │   ├── users/
│   │   │   │       │   ├── videos/
│   │   │   │       │   └── logs/
│   │   │   │       └── debug/        # Health check (dev/diagnóstico)
│   │   │   ├── components/
│   │   │   │   ├── video/            # VideoCard, EmptyState, StartRecordingButton
│   │   │   │   ├── auth/             # LogoutButton
│   │   │   │   └── billing/          # PricingCard, etc.
│   │   │   ├── lib/
│   │   │   │   ├── supabase/         # Clientes server e client
│   │   │   │   ├── prisma.ts         # Singleton Prisma Client
│   │   │   │   ├── google-drive.ts   # OAuth, upload, stream Drive
│   │   │   │   └── stripe.ts         # Instância Stripe
│   │   │   └── server/
│   │   │       ├── auth.ts           # getOrCreateDbUser
│   │   │       └── queries.ts        # Queries Prisma reutilizáveis
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── extension/                    # Chrome Extension MV3
│       ├── manifest.json
│       ├── src/
│       │   ├── background/
│       │   │   └── service_worker.ts # Estado global, orquestra gravação/upload
│       │   ├── offscreen/
│       │   │   ├── index.html
│       │   │   └── recorder.ts       # MediaRecorder + canvas compositing
│       │   ├── content/
│       │   │   └── index.ts          # Barra flutuante, bridge com o web app
│       │   ├── popup/
│       │   │   ├── index.html
│       │   │   ├── main.tsx
│       │   │   └── Popup.tsx         # UI do popup da extensão
│       │   ├── lib/
│       │   │   ├── api.ts            # Chamadas à API web (fetch + credentials)
│       │   │   └── storage.ts        # chrome.storage.local helpers
│       │   └── types/
│       │       └── index.ts          # Tipos compartilhados da extensão
│       ├── icons/                    # PNGs gerados: 16, 48, 128px
│       └── dist/                     # Build gerado pelo Vite (carregar no Chrome)
│
└── packages/
    └── shared/                       # Tipos e constantes compartilhados
        └── src/
            ├── types/
            │   ├── plan.ts           # Plan, PLAN_LIMITS, PLAN_PRICES_BRL
            │   └── video.ts          # Video, UploadPrepareResponse, etc.
            └── utils/
                └── format.ts         # formatDuration, formatBytes, etc.
```

---

## Banco de Dados

Schema Prisma em `apps/web/prisma/schema.prisma`.

### Modelos

#### `User`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | String (cuid) | PK |
| `email` | String unique | Email Supabase Auth |
| `name` | String? | Nome do usuário |
| `plan` | Enum (FREE/PRO/BUSINESS) | Plano atual |
| `stripeCustomerId` | String? | ID no Stripe |
| `isAdmin` | Boolean | Acesso à área admin |
| `suspended` | Boolean | Conta suspensa pelo admin |
| `lastLoginAt` | DateTime? | Último login |
| `googleDriveConnected` | Boolean | Drive OAuth conectado |
| `googleRefreshToken` | String? | Token de refresh Drive |
| `googleAccessToken` | String? | Token de acesso atual |
| `googleTokenExpiry` | DateTime? | Expiração do access token |

#### `Video`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | String (cuid) | PK interno |
| `publicId` | String unique | ID público para URL compartilhável |
| `title` | String | Título editável |
| `googleDriveFileId` | String? | ID do arquivo no Drive |
| `playbackUrl` | String? | URL de stream |
| `thumbnailUrl` | String? | URL do thumbnail |
| `durationSeconds` | Float? | Duração em segundos |
| `recordingMinutes` | Float | Minutos usados (para billing) |
| `visibility` | Enum (PRIVATE/LINK/PUBLIC) | Controle de acesso |
| `linkExpiresAt` | DateTime? | Expiração do link (plano FREE) |
| `userId` | String | FK → User |

#### `MonthlyUsage`
| Campo | Tipo | Descrição |
|---|---|---|
| `userId + year + month` | Unique | Uso mensal por usuário |
| `recordingMinutesUsed` | Float | Minutos gravados no mês |
| `transcriptionMinutesUsed` | Float | Minutos transcritos no mês |

#### `Transcript`
| Campo | Tipo | Descrição |
|---|---|---|
| `videoId` | String unique | FK → Video (1:1) |
| `language` | String | Idioma (padrão: pt-BR) |
| `fullText` | String? | Texto completo |
| `segments` | Json? | Segmentos com timestamps |
| `status` | Enum | PENDING/PROCESSING/DONE/FAILED |

#### `AdminLog`
| Campo | Tipo | Descrição |
|---|---|---|
| `action` | String | Descrição da ação |
| `targetId` | String? | ID do recurso afetado |
| `details` | String? | Detalhes adicionais |
| `adminId` | String? | FK → User (admin que agiu) |

### Enums

```
Plan:         FREE | PRO | BUSINESS
Visibility:   PRIVATE | LINK | PUBLIC
TranscriptStatus: PENDING | PROCESSING | DONE | FAILED
```

---

## Planos e Limites

Definidos em `packages/shared/src/types/plan.ts`.

| Limite | FREE | PRO | BUSINESS |
|---|---|---|---|
| Gravação/mês | 240 min (4h) | 1.800 min (30h) | 7.200 min (120h) |
| Transcrição/mês | 60 min (1h) | 300 min (5h) | 600 min (10h) |
| Vídeos ativos | 10 | Ilimitado | Ilimitado |
| Expiração de links | 7 dias | Permanente | Permanente |
| Watermark | Sim | Não | Não |
| Assentos | 1 | 1 | 5 |

**Preços (BRL):**
| Plano | Mensal | Anual |
|---|---|---|
| PRO | R$49 | R$490 |
| BUSINESS | R$99 | R$990 |

**Add-ons disponíveis (previstos):**
- Hora extra de gravação: R$24
- Hora extra de transcrição: R$4
- Assento extra: R$29
- Extensão de link: R$9
- Domínio customizado: R$19

---

## API Reference

Todas as rotas protegidas exigem sessão Supabase válida (cookie `sb-*`).  
Rotas `/api/admin/*` exigem adicionalmente `user.isAdmin === true`.

### Uploads

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/uploads/create` | Cria sessão de upload no Google Drive. Retorna `uploadUrl`, `videoId`, `googleAccessToken` |
| POST | `/api/uploads/complete` | Finaliza upload: salva `googleDriveFileId`, duração, thumbnail. Retorna `shareUrl` |

**Fluxo de upload:**
```
Extensão → POST /api/uploads/create → { uploadUrl, videoId, googleAccessToken }
Extensão → PUT uploadUrl (blob direto ao Google Drive, com Authorization: Bearer token)
Extensão → POST /api/uploads/complete { videoId, googleDriveFileId, durationSeconds }
          ← { shareUrl, publicId }
```

### Vídeos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/videos` | Lista vídeos do usuário (com busca `?q=`) |
| GET | `/api/videos/[id]` | Detalhes de um vídeo |
| PATCH | `/api/videos/[id]` | Editar título, visibilidade |
| DELETE | `/api/videos/[id]` | Deletar vídeo (remove do Drive e do banco) |
| GET | `/api/proxy/video/[fileId]` | Proxy de stream do Drive (suporte a Range requests) |

### Usuário

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/me/limits` | Limites do plano, uso atual, Drive conectado |

### Transcrição

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/transcripts/[videoId]` | Busca transcrição existente |
| POST | `/api/transcripts/[videoId]` | Aciona transcrição via Deepgram (assíncrono) |

### Autenticação Google Drive

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/auth/google/connect` | Redireciona para OAuth consent screen |
| GET | `/api/auth/google/callback` | Recebe `code`, troca por tokens, salva no banco |
| POST | `/api/auth/google/disconnect` | Remove tokens do banco |

### Billing

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/billing/create-checkout` | Cria sessão Stripe Checkout. Body: `{ priceId }` |
| POST | `/api/billing/portal` | Abre Customer Portal do Stripe |
| POST | `/api/webhooks/stripe` | Webhook: atualiza plano no banco após pagamento |

### Admin (requer `isAdmin = true`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/stats` | Métricas gerais (usuários, vídeos, MRR) |
| GET | `/api/admin/users` | Lista paginada de usuários com filtros |
| GET | `/api/admin/users/[id]` | Detalhe completo do usuário |
| PATCH | `/api/admin/users/[id]` | Alterar plano, status, nome |
| DELETE | `/api/admin/users/[id]` | Deletar usuário |
| POST | `/api/admin/users/[id]/reset-usage` | Zerar uso mensal |
| GET | `/api/admin/videos` | Lista todos os vídeos |
| DELETE | `/api/admin/videos/[id]` | Deletar vídeo |
| GET | `/api/admin/logs` | Logs de auditoria |

### Diagnóstico

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/debug` | Health check: env vars + conexão DB |

---

## Extensão Chrome

### Arquitetura MV3

```
┌─────────────────────────────────────────────────────┐
│  Popup (popup/Popup.tsx)                            │
│  • UI: modos, dispositivos, countdown, status       │
│  • Comunica via chrome.runtime.sendMessage          │
└────────────────┬────────────────────────────────────┘
                 │ START/STOP/PAUSE/CANCEL/GET_STATE
                 ▼
┌─────────────────────────────────────────────────────┐
│  Service Worker (background/service_worker.ts)      │
│  • Estado: idle → recording → uploading → done      │
│  • Gerencia offscreen document                      │
│  • Faz upload para Drive via /api/uploads/*         │
│  • Transmite STATE_UPDATE, UPLOAD_PROGRESS          │
└────────┬────────────────────┬───────────────────────┘
         │ START/STOP         │ broadcastToContent
         ▼                    ▼
┌────────────────┐   ┌────────────────────────────────┐
│ Offscreen Doc  │   │ Content Script (content/index) │
│ recorder.ts    │   │ • Barra flutuante arrastável   │
│ • getDisplay   │   │ • Timer em tempo real          │
│   Media        │   │ • Recebe postMessage do web app │
│ • getUserMedia │   │ • Bridge: page → service worker │
│ • Canvas       │   │ • Anuncia extensão via         │
│   compositing  │   │   CustomEvent "screenflow-ready"│
│ • MediaRecorder│   └────────────────────────────────┘
│ • envia        │
│   VIDEO_READY  │
└────────────────┘
```

### Fluxo de Gravação

```
1. Usuário clica "Iniciar" no popup
2. Popup faz countdown 3s e fecha (window.close())
3. Service worker recebe START_RECORDING
4. SW checa limites via GET /api/me/limits
5. SW cria offscreen document
6. SW envia START_RECORDING ao offscreen
7. Offscreen chama getDisplayMedia (+ getUserMedia se câmera)
8. Para screen+camera: canvas compositing com setInterval a 30fps
9. MediaRecorder grava em WebM/VP9, chunks de 1s
10. Barra flutuante aparece na aba gravada (content script)
11. Usuário clica "Parar" na barra
12. Offscreen para recorder → cria Blob → converte para base64
13. Offscreen envia VIDEO_READY ao SW
14. SW chama POST /api/uploads/create
15. SW faz PUT direto ao Drive (resumable upload com XHR, progress tracking)
16. SW chama POST /api/uploads/complete
17. SW recebe shareUrl, armazena lastResult
18. Popup exibe "Vídeo pronto!" com link copiável
```

### Mensagens entre contextos

| Tipo | De → Para | Descrição |
|---|---|---|
| `START_RECORDING` | popup/page → SW | Iniciar com RecordingConfig |
| `STOP_RECORDING` | popup/content → SW → offscreen | Parar gravação |
| `PAUSE_RECORDING` | popup/content → SW → offscreen | Pausar |
| `RESUME_RECORDING` | popup/content → SW → offscreen | Retomar |
| `CANCEL_RECORDING` | popup/content → SW → offscreen | Cancelar sem upload |
| `GET_STATE` | popup → SW | Estado atual + uploadPercent + result |
| `STATE_UPDATE` | SW → todos | Mudança de estado |
| `VIDEO_READY` | offscreen → SW | Blob base64 pronto para upload |
| `UPLOAD_PROGRESS` | SW → popup + content | Percentual do upload |
| `RECORDING_DONE` | SW → popup | ShareUrl final |
| `RECORDING_ERROR` | SW/offscreen → popup + content | Mensagem de erro |
| `KEEPALIVE` | offscreen → SW | Mantém SW vivo (MV3, a cada 20s) |

### Bridge Web App ↔ Extensão

O content script injeta no window da página:

```javascript
// Extensão detectada pela página:
document.addEventListener("screenflow-ready", () => { /* extensão instalada */ })

// Página inicia gravação:
window.postMessage({ type: "SCREENFLOW_START_RECORDING", config: { mode: "screen", ... } }, "*")

// Página envia token de autenticação:
window.postMessage({ type: "SCREENFLOW_SET_TOKEN", token: "supabase_access_token" }, "*")
```

### Permissões (manifest.json)

```json
"permissions": ["storage", "tabs", "offscreen", "scripting"],
"host_permissions": ["<all_urls>"]
```

### Build e instalação local

```bash
cd apps/extension
pnpm build                    # Gera apps/extension/dist/
# Chrome → chrome://extensions → Modo desenvolvedor
# → "Carregar sem compactação" → selecionar apps/extension/dist/
```

---

## Área Administrativa

Acessível em `/admin` — restrita ao usuário com `isAdmin = true` no banco (octacm@gmail.com).

### Páginas

| Rota | Descrição |
|---|---|
| `/admin` | Dashboard com métricas: total usuários, vídeos, MRR estimado, novos usuários |
| `/admin/users` | Tabela paginada de usuários com filtros por plano/status/Drive |
| `/admin/users/[id]` | Detalhe completo: dados, uso, vídeos recentes, edição |
| `/admin/videos` | Todos os vídeos com filtros e ação de deletar |
| `/admin/stats` | Gráficos de crescimento e uso |
| `/admin/plans` | Visão dos planos com distribuição de usuários |
| `/admin/logs` | Logs de auditoria de ações admin |

### Ações disponíveis no admin

- Alterar plano do usuário (FREE/PRO/BUSINESS)
- Suspender / Reativar conta
- Resetar uso mensal do usuário
- Desconectar Google Drive de um usuário
- Deletar usuário (com confirmação)
- Deletar vídeo
- Todas as ações geram registro em `AdminLog`

---

## Variáveis de Ambiente

### Web App (`apps/web/.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://daddapoynmahpkjeiqmt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Banco (usar pooler no Vercel — NÃO a conexão direta que é IPv6-only)
DATABASE_URL=postgresql://postgres.daddapoynmahpkjeiqmt:SENHA@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:SENHA@db.daddapoynmahpkjeiqmt.supabase.co:5432/postgres

# Google OAuth (Drive)
GOOGLE_CLIENT_ID=218934268776-74eo5i8jb2g2evs4uitd35bbo6p9r3mt.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_1TfPXKGn4WD0VixUnxL57zAx
STRIPE_BUSINESS_PRICE_ID=price_1TfPYuGn4WD0VixUwFfhpT2H
STRIPE_WEBHOOK_SECRET=whsec_...

# Deepgram
DEEPGRAM_API_KEY=3d7cc3d7f48a...

# App
NEXT_PUBLIC_APP_URL=https://plugin-grava-tela-screen-flow-exten.vercel.app
```

### Prisma CLI (`apps/web/prisma/.env`)

```env
DATABASE_URL="postgresql://postgres.PROJECT_ID:SENHA@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:SENHA@db.PROJECT_ID.supabase.co:5432/postgres"
```

> **Importante:** O Vercel executa lambdas com IPv4. A conexão direta do Supabase (`db.xxx.supabase.co`) usa IPv6 e NÃO funciona no Vercel. Use sempre o **Transaction Pooler** (`aws-1-us-east-1.pooler.supabase.com:6543`).

---

## Setup Local

### Pré-requisitos

- Node.js 20+
- pnpm 11+ (`npm install -g pnpm`)
- Conta Supabase com projeto criado
- Conta Google Cloud com OAuth configurado
- Conta Stripe (modo teste ok para dev)

### Instalação

```bash
git clone https://github.com/octaviomemoria/PluginGravaTelaScreenFlow.git
cd PluginGravaTelaScreenFlow/screenflow-recorder

pnpm install
```

### Configurar variáveis de ambiente

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Preencher todas as variáveis

cp apps/web/prisma/.env.example apps/web/prisma/.env
# Preencher DATABASE_URL e DIRECT_URL
```

### Banco de dados

```bash
cd apps/web
pnpm prisma migrate dev      # Aplica migrations
pnpm prisma generate         # Gera Prisma Client
pnpm prisma db seed          # (se existir) Seed inicial
```

Para marcar o admin manualmente:
```sql
UPDATE users SET "isAdmin" = true WHERE email = 'octacm@gmail.com';
```

### Rodar localmente

```bash
# Tudo (web + shared)
pnpm dev

# Só a web
pnpm --filter web dev

# Build da extensão
pnpm --filter extension build
```

### Carregar extensão no Chrome

1. Chrome → `chrome://extensions`
2. Ativar "Modo desenvolvedor"
3. "Carregar sem compactação" → selecionar `apps/extension/dist/`
4. Recarregar após cada `pnpm --filter extension build`

### Regenerar ícones da extensão

```bash
cd apps/extension
node generate-icons.js
# Gera icon16.png, icon48.png, icon128.png em apps/extension/icons/
```

---

## Deploy

### Vercel (web app)

O deploy é automático via GitHub Actions quando há push na branch `main`.

**Variáveis de ambiente no Vercel** (Project Settings → Environment Variables):

Todas as variáveis de `apps/web/.env.local` devem estar configuradas no Vercel, com destaque para:
- `DATABASE_URL` → usar pooler `aws-1-us-east-1.pooler.supabase.com:6543`
- `STRIPE_WEBHOOK_SECRET` → obtido no Stripe Dashboard após criar o webhook
- `NEXT_PUBLIC_APP_URL` → URL de produção do Vercel

**Webhook Stripe:**
```
URL: https://plugin-grava-tela-screen-flow-exten.vercel.app/api/webhooks/stripe
Eventos: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

### Google OAuth (Configuração obrigatória)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. OAuth Client ID → Authorized redirect URIs deve incluir:
   ```
   https://plugin-grava-tela-screen-flow-exten.vercel.app/api/auth/google/callback
   http://localhost:3000/api/auth/google/callback
   ```
3. OAuth consent screen → adicionar `octacm@gmail.com` como test user (enquanto em modo Testing)

### Extensão Chrome

```bash
pnpm --filter extension build
# Compactar apps/extension/dist/ como .zip
# Chrome Web Store Developer Dashboard → fazer upload
```

---

## Serviços Externos

### Supabase
- **Project ID:** `daddapoynmahpkjeiqmt`
- **Pooler (usar no Vercel):** `aws-1-us-east-1.pooler.supabase.com:6543`
- **Console:** https://supabase.com/dashboard/project/daddapoynmahpkjeiqmt

### Google Cloud
- **Client ID:** `218934268776-74eo5i8jb2g2evs4uitd35bbo6p9r3mt`
- **Scopes usados:** `https://www.googleapis.com/auth/drive.file`
- **Console:** https://console.cloud.google.com

### Stripe
- **Modo:** Live
- **Pro Price ID:** `price_1TfPXKGn4WD0VixUnxL57zAx`
- **Business Price ID:** `price_1TfPYuGn4WD0VixUwFfhpT2H`
- **Dashboard:** https://dashboard.stripe.com

### Deepgram
- **Modelo:** `nova-2`
- **Idioma padrão:** `pt-BR`
- **Console:** https://console.deepgram.com

### Vercel
- **Project ID:** `prj_lMeB0cBAhvkbmpx8zXVw9yvQ50wx`
- **Team ID:** `team_HMwpatvleXyqSoji20MGZaQk`
- **Dashboard:** https://vercel.com/dashboard

---

## Fluxos Principais

### 1. Primeiro uso (usuário novo)

```
/signup → cria conta Supabase → getOrCreateDbUser (cria User no Postgres)
→ /dashboard → aviso "Conecte o Google Drive"
→ /settings/account → "Conectar Google Drive"
→ OAuth Google → callback salva refresh token
→ Extensão instalada → popup detecta Drive conectado
→ Gravar!
```

### 2. Gravação e upload

```
Popup: selecionar modo → countdown 3s → popup fecha
Offscreen: getDisplayMedia + getUserMedia
Content: barra flutuante aparece
[gravação em andamento]
Usuário clica "Parar" na barra flutuante
Offscreen: stop MediaRecorder → cria Blob → base64 → VIDEO_READY
SW: createUploadSession → upload Drive (com progresso) → completeUpload
Popup: "Vídeo pronto!" + link copiável
Dashboard: novo vídeo aparece na grade
```

### 3. Transcrição e ata

```
/video/[id] → "Gerar transcrição"
POST /api/transcripts/[videoId]
→ baixa vídeo do Drive via proxy
→ envia para Deepgram nova-2
→ salva fullText + segments no banco
→ exibe transcrição com timestamps
→ "Gerar ata de reunião" → formata com IA
```

### 4. Upgrade de plano

```
/settings/billing → "Upgrade para Pro"
POST /api/billing/create-checkout → Stripe Checkout
Usuário paga → Stripe envia webhook
POST /api/webhooks/stripe (checkout.session.completed)
→ atualiza user.plan = PRO no banco
→ usuário volta ao app com novos limites
```

---

## Roadmap

### Próximas features planejadas

**Alta prioridade:**
- [ ] Download de vídeo direto do player
- [ ] Contador de visualizações (quantas vezes o link foi assistido)
- [ ] Notificação por email quando vídeo é assistido
- [ ] Trim de vídeo (cortar início/fim no browser)
- [ ] Comentários com timestamp no player

**Médio prazo:**
- [ ] Pastas/coleções para organizar vídeos
- [ ] Workspace/time (múltiplos membros)
- [ ] Código embed (`<iframe>`) para Notion/Confluence
- [ ] Thumbnail customizada (upload de imagem de capa)
- [ ] Proteção por senha no vídeo
- [ ] Controle de velocidade no player (0.5x / 1x / 1.5x / 2x)

**IA e automação:**
- [ ] Resumo automático em 3 bullet points
- [ ] Capítulos automáticos com timestamps
- [ ] Busca por conteúdo falado no vídeo
- [ ] Tradução de transcrição

**Integrações:**
- [ ] Slack (postar link direto no canal)
- [ ] Notion (embed automático)
- [ ] Zapier/Webhooks
- [ ] API pública

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
pnpm --filter extension build

# Prisma
pnpm --filter web exec prisma migrate dev
pnpm --filter web exec prisma db push
pnpm --filter web exec prisma studio

# Gerar ícones da extensão
node apps/extension/generate-icons.js
```

---

*Documentação atualizada em junho/2026. Admin: octacm@gmail.com*
