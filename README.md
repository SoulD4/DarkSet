# DarkSet — Seu Treino

> Treine. Evolua. Domine.

App mobile-first (PWA) de treino e evolução física: fichas personalizadas, execução de treino em tempo real, histórico, analytics, cardio com GPS, meditação, nutrição, squads e ranking global.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** com design system próprio — "Graphite + Volt" (ver [`DESIGN.md`](./DESIGN.md))
- **Firebase** — Auth (Google/e-mail) + Firestore
- **Framer Motion** (animações) · **Recharts** (gráficos) · **Lucide** (ícones)
- Fontes: Space Grotesk (display) · Geist (corpo) · Barlow Condensed (logotipo)

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencher credenciais Firebase
npm run dev                  # http://localhost:3000
```

### Variáveis de ambiente

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

São chaves públicas de client (prefixo `NEXT_PUBLIC_`); a segurança é garantida pelas regras do Firestore (`firestore.rules`).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |

## Estrutura

```
app/           → rotas (App Router), uma pasta por feature
components/
  core/        → design system (Button, StatTile, Toast, EmptyState…)
  layout/      → PageShell, AppChrome (TopBar, TabBar, MenuSheet)
  ui/          → primitivos shadcn/ui
lib/           → firebase, rankSystem, types, exerciseGifs, hooks
public/        → manifest PWA, ícones, sons, screenshots
```

## Deploy

Deploy contínuo na **Vercel**: push na branch `main` → produção em [dark-set.vercel.app](https://dark-set.vercel.app). Configurar as variáveis de ambiente no dashboard da Vercel.

Regras do Firestore: `firebase deploy --only firestore:rules`.

## Decisões arquiteturais

- **Dark mode único**: app usado em ambiente de academia; contraste e conforto priorizados. Tema claro fica como possível evolução.
- **Dados por usuário como payload JSON** em `users/{uid}/data/*`: leitura em 1 round-trip; migração para subcoleções é o caminho quando o histórico crescer.
- **Vermelho `#E31B23` é exclusivo do logotipo**; o accent de UI é o volt `#C8F542`.
