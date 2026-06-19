# Palpite Gol — Documentação

Projeto de bolão em tempo real. O front está pronto com dados de demonstração; o banco Supabase começa vazio e será populado conforme as integrações forem ligadas.

## Índice

| Documento | Descrição |
|-----------|-----------|
| [SETUP.md](./SETUP.md) | Como rodar o projeto localmente |
| [CHANGELOG.md](./CHANGELOG.md) | Histórico de atualizações |
| [env.example](./env.example) | Variáveis de ambiente (copie para `.env`) |
| [supabase/README.md](./supabase/README.md) | Configurar Supabase |
| [supabase/schema.sql](./supabase/schema.sql) | Schema inicial do banco |
| [api-jogos/README.md](./api-jogos/README.md) | Configurar API de futebol |

## Estrutura do código (após refatoração)

```
src/
├── lib/bolao/          # Tipos, mock demo, lógica de ranking
├── lib/api/            # Supabase + API de jogos (server-only)
├── components/bolao/   # Componentes reutilizáveis do bolão
├── components/landing/ # Seções da página inicial
└── routes/             # Páginas (fluxo demo)
```

## Fluxo das páginas (demo atual)

```
/ → /create → /share → /join → /pick → /live → /final
                              ↘ /admin
/ → /apoiar (apoiadores no rodapé)
```

## Próximos passos

1. Copiar `docs/env.example` para `.env` na raiz do projeto
2. Rodar `docs/supabase/schema.sql` no SQL Editor do Supabase
3. Preencher chaves no `.env`
4. Substituir `DEMO_BOLAO` por dados reais via `createServerFn`
