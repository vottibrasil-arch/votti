# Como rodar localmente

## Requisitos

- Node.js 20+
- npm 10+

## Passos

```powershell
cd c:\Users\IDALINA\Desktop\palpite_gol
npm install
npm run dev
```

Abra **http://localhost:5173**

## Páginas para testar

| URL | O que ver |
|-----|-----------|
| `/` | Landing page |
| `/create` | Criar bolão |
| `/share` | Link compartilhável |
| `/join` | Convite para participar |
| `/pick` | Escolher placar |
| `/live` | Tela ao vivo (demo) |
| `/admin` | Painel do administrador |
| `/final` | Tela de vitória |
| `/apoiar` | Apoiadores |

## Variáveis de ambiente

Opcional para ver só o front com mock. Obrigatório quando conectar Supabase/API:

```powershell
copy docs\env.example .env
```

Edite `.env` com suas chaves.

## Build de produção

```powershell
npm run build
npm run preview
```
