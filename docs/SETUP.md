# Como rodar localmente

## Requisitos

- Node.js 20+
- npm 10+

## Passos

```powershell
cd c:\Users\IDALINA\Desktop\votti
npm install
npm run dev
```

Abra **http://localhost:5173**

## Páginas

| URL | O que ver |
|-----|-----------|
| `/` | Home — Criar votação / Minhas votações |
| `/criar` | Criar votação (placeholder) |
| `/minhas` | Minhas votações (placeholder) |

## Variáveis de ambiente

```powershell
copy docs\env.example .env
```

Preencha as chaves do Supabase (projeto novo). Veja [supabase/README.md](./supabase/README.md).

Teste a conexão:

```powershell
npm run test:supabase
```

## Build de produção

```powershell
npm run build
npm run preview
```
