# PomoTick 🍅

Plataforma social de estudos com Pomodoro colaborativo, Kanban, lista de tarefas e JAM sessions.

## Stack
- **Backend:** Node.js + Express (CommonJS puro — sem Babel)
- **Banco:** MongoDB via Mongoose
- **Frontend:** EJS + CSS + JS vanilla (sem dependências de build)
- **Sessão:** express-session + connect-mongo

## Estrutura
```
pomotick/
├── src/
│   ├── index.js                  ← servidor principal
│   ├── database/index.js         ← conexão MongoDB
│   ├── app/
│   │   ├── schemas/index.js      ← modelos Mongoose
│   │   └── middlewares/auth.js   ← guards de autenticação
│   └── routes/
│       ├── auth.js               ← login / signup / logout
│       ├── pages.js              ← renderização de páginas
│       ├── profile.js            ← API de perfil
│       ├── todo.js               ← API de tarefas
│       ├── kanban.js             ← API de kanban
│       ├── jam.js                ← API de JAM sessions
│       └── admin.js              ← API de administração
├── views/
│   ├── login.ejs
│   ├── signup.ejs
│   ├── home.ejs
│   └── admin.ejs
└── public/
    ├── style.css
    ├── app.js
    └── default-avatar.svg
```

## Instalação

```bash
# 1. Copie o .env.example
cp .env.example .env

# 2. Edite o .env com suas credenciais MongoDB
nano .env

# 3. Instale as dependências
npm install

# 4. Inicie o servidor
npm start

# Desenvolvimento com hot reload
npm run dev
```

## Variáveis de Ambiente (.env)

```env
PORT=3000
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/pomotick
SESSION_SECRET=troque-por-uma-frase-secreta-longa
```

## Funcionalidades

| Feature | Descrição |
|---|---|
| ✅ Auth | Login, cadastro, sessão persistente no MongoDB |
| 📋 Todo | Adicionar, marcar, excluir tarefas; relatório de tarefas |
| 📌 Kanban | Quadros com 3 colunas, cards com prioridade, mover entre colunas |
| 🍅 Pomodoro | Timer local com anel animado, sessões, ambiente sonoro |
| 👥 JAM | Pomodoro colaborativo em tempo real + kanban compartilhado |
| 👤 Perfil | Nome, bio, foto de perfil (base64) |
| 🛡️ Admin | Listar, editar e excluir usuários (role=admin) |

## Criar admin

Registre um usuário normalmente, depois no MongoDB Atlas ou Compass:
```js
db.users.updateOne({ email: "seu@email.com" }, { $set: { role: "admin" } })
```

## Rotas da API

### Auth
- `POST /api/login` — login
- `POST /api/signup` — cadastro
- `GET  /logout` — sair

### Perfil
- `GET  /api/profile` — dados do perfil
- `PUT  /api/profile` — atualizar nome/bio
- `PUT  /api/profile/picture` — atualizar foto (base64)
- `PUT  /api/profile/password` — alterar senha

### Todo
- `GET    /api/todo` — listar tarefas
- `POST   /api/todo` — criar tarefa
- `PATCH  /api/todo/:id` — marcar/desmarcar
- `DELETE /api/todo/:id` — excluir
- `GET    /api/todo/report` — tarefas do relatório

### Kanban
- `GET    /api/kanban` — listar quadros
- `POST   /api/kanban` — criar quadro
- `DELETE /api/kanban/:boardId` — excluir quadro
- `POST   /api/kanban/:boardId/card` — criar card
- `DELETE /api/kanban/:boardId/card/:cardId` — excluir card
- `PATCH  /api/kanban/:boardId/card/:cardId/move` — mover card

### JAM
- `POST /api/jam/create` — criar jam
- `POST /api/jam/join` — entrar em jam
- `GET  /api/jam/state?code=XXX` — estado atual
- `POST /api/jam/start` — iniciar timer
- `POST /api/jam/stop` — parar timer
- `POST /api/jam/leave` — sair do jam
- `POST /api/jam/kanban/card` — adicionar card no kanban do jam

### Admin
- `GET    /api/admin/users` — listar todos os usuários
- `PUT    /api/admin/users/:id` — editar usuário
- `DELETE /api/admin/users/:id` — excluir usuário
