# VOTTI — Documentação

Plataforma de votações em tempo real.

## Índice

| Documento | Descrição |
|-----------|-----------|
| [SETUP.md](./SETUP.md) | Como rodar o projeto localmente |
| [CHANGELOG.md](./CHANGELOG.md) | Histórico de atualizações |
| [env.example](./env.example) | Variáveis de ambiente |
| [supabase/README.md](./supabase/README.md) | Configurar Supabase (projeto novo) |
| [supabase/schema.sql](./supabase/schema.sql) | Schema do banco VOTTI |

## Estrutura do código

```
src/
├── components/          # UI (logo, rodapé, ui-kit)
├── lib/
│   ├── api/             # Supabase (server + browser)
│   ├── supabase/        # Tipos do banco
│   └── votti/           # Sessão do votante, Realtime
└── routes/
    ├── index.tsx        # Home
    ├── criar.tsx        # Criar votação
    └── minhas.tsx       # Minhas votações
```

## Fluxo atual

```
/ → Criar votação (/criar) ou Minhas votações (/minhas)
```

## Configuração Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com)
2. Execute `docs/supabase/schema.sql` e `realtime.sql`
3. Copie `docs/env.example` → `.env` e preencha as chaves
4. Teste: `npm run test:supabase`
