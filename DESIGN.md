# DarkSet Design System — "Graphite + Volt" (v3, 2026)

Especificação canônica da reconstrução. **Toda página reescrita DEVE seguir este documento à risca.**

## Identidade

- Conceito: grafite azulado profundo + accent **volt** (verde-lima ácido). Linguagem de performance esportiva premium.
- O vermelho `#E31B23` é **exclusivo do logotipo** (componente `<Logo/>` no shell). PROIBIDO em qualquer outro lugar.
- Dark mode único (decisão: app de treino usado em academia; tema claro fora de escopo desta versão).
- Ícones: **lucide-react SEMPRE**. Proibido emoji como ícone de UI (emoji ok apenas em conteúdo celebratório pontual, ex: tela de treino concluído).

## Tokens (via Tailwind — NUNCA hex hardcoded em páginas)

| Uso | Classe Tailwind |
|---|---|
| Fundo do app | `bg-bg` |
| Card / superfície 1 | `bg-surface-1` (ou utilitário `.card`) |
| Superfície aninhada | `bg-surface-2` (`.card-2`) |
| Hover/ativo | `bg-surface-3` |
| Bordas | `border-line` |
| Texto primário/secundário/mudo | `text-ink-1` / `text-ink-2` / `text-ink-3` |
| Accent | `text-accent`, `bg-accent`, `bg-accent-soft`, `border-accent/30` |
| Texto sobre accent | `text-accent-ink` |
| Semânticas | `ok`, `warn`, `danger`, `info` (+ variante `-soft`) |
| Sombras | `shadow-card`, `shadow-float`, `shadow-volt` |

Gráficos (Recharts): usar CSS vars `var(--chart-1)` … `var(--chart-8)`.
Grid de gráfico: `stroke="rgba(151,163,181,0.08)"`. Eixos: `tick={{fill:'#5E6878',fontSize:10}}`.

## Tipografia

- `font-display` (Space Grotesk): títulos, números grandes, stats, timers. Números com classe `tnum`.
- `font-sans` (Geist): corpo, labels, inputs — é o default do body.
- `font-logo` (Barlow Condensed): SOMENTE o componente `<Logo/>`.
- Título de página: `font-display font-bold text-[1.7rem] tracking-tight` (usar `<PageHeader/>`).
- Label de seção: classe `.eyebrow`.

## Componentes obrigatórios (`@/components/core/*`)

```tsx
import Button from '@/components/core/Button';        // {variant:'primary'|'soft'|'ghost'|'danger'|'outline', size:'sm'|'md'|'lg', full?}
import Spinner from '@/components/core/Spinner';      // {size?, full?} — full=true centraliza em 55vh
import PageHeader from '@/components/core/PageHeader';// {title, subtitle?, right?}
import StatTile from '@/components/core/StatTile';    // {value, label, sub?, icon?, tone?, className?}
import EmptyState from '@/components/core/EmptyState';// {icon?, title, subtitle?, action?}
import { useToast, ToastViewport } from '@/components/core/Toast'; // show(msg, 'ok'|'warn'|'danger')
```

Shell: `import PageShell from '@/components/layout/PageShell'` — props `{children, className?, hideBottomNav?}`.
Usar `hideBottomNav` em telas imersivas (sessão ativa de treino, timers fullscreen, share).

Utilitários CSS prontos: `.card`, `.card-2`, `.field` (inputs), `.chip` / `.chip-active`, `.eyebrow`, `.skeleton`, `.tnum`, `.no-scrollbar`.

## Padrões de página

1. `'use client'` no topo (páginas usam Firebase client-side).
2. Loading: `<Spinner full/>` dentro de `<PageShell>`.
3. Não logado: `<EmptyState>` com ação `<Button onClick={()=>router.push('/login')}>Entrar</Button>`.
4. Vazio de dados: `<EmptyState>` com ícone lucide e CTA relevante.
5. Toasts: `useToast()` + `<ToastViewport toast={toast}/>` — substituir implementações locais de toast.
6. Motion: entrada `initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}`, stagger de listas `delay: i*0.04` (cap 0.4s), botões `whileTap={{scale:.97}}` (o `<Button/>` já faz).
7. Espaçamento: seções separadas por `mb-6`; grids de stats `grid grid-cols-3 gap-2.5` (ou cols-2).
8. Preferir Tailwind classes; inline style APENAS para valores dinâmicos (larguras %, cores computadas de gráfico).

## REGRAS INVIOLÁVEIS — preservação funcional

1. **NÃO alterar nenhum path do Firestore** (`users/{uid}/data/history`, `data/plans`, `data/selos`, `data/cardio`, `data/zen`, `data/diet`, `globalRank/{uid}`, `squads/*`, `personal_*`).
2. **NÃO alterar o formato dos payloads** (JSON string em `payload`, shapes `{entries:[{name,exId?,sets:[{w,r}]}]}`, `{list,activeId}`, etc.).
3. **NÃO alterar cálculos** (streak, volume, 1RM estimado `w*(1+r/30)`, pontos de rank, desafios semanais por seed).
4. **NÃO remover funcionalidades**: toda ação, filtro, modal, timer, som, vibração, GPS, chat, exportação CSV etc. existente deve continuar funcionando.
5. Manter `export default` e nome do componente de página.
6. Copiar a lógica (hooks, effects, funções de dados) do arquivo original — mudar apenas a camada de apresentação. Pode extrair subcomponentes locais no mesmo arquivo.
7. Textos em pt-BR, tom direto e motivador (manter voz atual).

## Checklist por página

- [ ] Zero hex hardcoded (exceto via tokens) / zero `Barlow Condensed` inline / zero emoji em nav ou ícone de botão
- [ ] PageHeader + estados loading/vazio/erro/não-logado
- [ ] Toast unificado
- [ ] Compila sem erro TS e sem warnings novos de lint
