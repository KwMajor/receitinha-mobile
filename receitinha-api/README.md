# receitinha-api

Backend do aplicativo Receitinha. Fornece persistência de dados na nuvem para receitas, favoritos, coleções, planejamento semanal, listas de compras, histórico de preparo e categorias do usuário, além de funcionalidades sociais (feed público, avaliações, comentários).

---

## Tecnologias

- **Node.js** + **Express**
- **PostgreSQL** (`pg`) — banco de dados principal
- **Firebase Authentication** — verificação de tokens JWT sem service account
- **dotenv** — variáveis de ambiente
- **nodemon** — reload automático em desenvolvimento

---

## Estrutura

```
src/
├── db.js                  # Pool PostgreSQL + init() com CREATE TABLE IF NOT EXISTS
├── index.js               # Entry point: registra rotas e inicia o servidor
├── middleware/
│   └── auth.js            # Verifica Firebase ID token, seta req.user = { uid, name }
└── routes/
    ├── recipes.js         # Rotas públicas: feed, receita individual, publicar, avaliar, denunciar
    └── user/
        ├── recipes.js     # CRUD de receitas do usuário (com ingredientes e passos)
        ├── favorites.js   # Favoritos + coleções personalizadas
        ├── categories.js  # Categorias (padrão + personalizadas)
        ├── history.js     # Histórico de preparo + estatísticas
        ├── shopping.js    # Listas de compras + itens + geração a partir do planejamento
        └── planning.js    # Planejamento semanal + slots de refeição configuráveis
```

---

## Configuração

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie o banco de dados PostgreSQL:
   ```sql
   CREATE DATABASE receitinha;
   ```

3. Crie o arquivo `.env` na raiz:
   ```env
   PORT=3000
   FIREBASE_PROJECT_ID=seu-project-id
   DATABASE_URL=postgresql://postgres:sua-senha@localhost:5432/receitinha
   ```

4. Inicie em desenvolvimento:
   ```bash
   npm run dev
   ```

   As tabelas são criadas automaticamente na primeira execução.

---

## Rotas

### Públicas (sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/recipes/feed` | Feed paginado de receitas públicas (`?cursor=&limit=`) |
| GET | `/api/recipes/:id` | Detalhes de uma receita pública |
| GET | `/health` | Health check |

### Autenticadas — Receitas do usuário (`/api/user/recipes`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista receitas (`?query=&categories[]=&maxPrepTime=`) |
| GET | `/:id` | Receita completa (ingredientes + passos) |
| POST | `/` | Criar receita |
| PUT | `/:id` | Atualizar receita |
| DELETE | `/:id` | Apagar receita |

### Autenticadas — Favoritos e Coleções (`/api/user/favorites`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista de receitas favoritas |
| GET | `/:recipeId/check` | Verifica se é favorita |
| POST | `/:recipeId/toggle` | Favoritar / desfavoritar |
| GET | `/collections` | Lista coleções |
| POST | `/collections` | Criar coleção |
| PUT | `/collections/:id` | Renomear coleção |
| DELETE | `/collections/:id` | Apagar coleção |
| GET | `/collections/:id/recipes` | Receitas de uma coleção |
| POST | `/collections/:id/recipes/:recipeId` | Adicionar receita à coleção |
| DELETE | `/collections/:id/recipes/:recipeId` | Remover receita da coleção |

### Autenticadas — Planejamento (`/api/user/planning`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Plano da semana (`?weekStart=YYYY-MM-DD`) |
| PUT | `/meal` | Definir refeição `{ weekStart, dayIndex, mealType, recipeId }` |
| DELETE | `/meal` | Remover refeição `{ weekStart, dayIndex, mealType }` |
| GET | `/slots` | Slots de refeição da semana (`?weekStart=`) |
| POST | `/slots` | Adicionar slot extra `{ weekStart, label }` |
| DELETE | `/slots/:mealType` | Remover slot extra (`?weekStart=`) |
| PUT | `/slots/reorder` | Reordenar slots `{ weekStart, orderedTypes }` |

### Autenticadas — Listas de Compras (`/api/user/shopping`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/lists` | Lista todas as listas |
| POST | `/lists` | Criar lista |
| PUT | `/lists/:id` | Renomear lista |
| DELETE | `/lists/:id` | Apagar lista |
| PATCH | `/lists/:id/activate` | Definir lista ativa |
| GET | `/lists/active` | ID da lista ativa |
| GET | `/lists/:id/items` | Itens de uma lista |
| POST | `/lists/:id/items` | Adicionar item |
| PATCH | `/items/:id/toggle` | Marcar/desmarcar item |
| DELETE | `/items/:id` | Remover item |
| DELETE | `/lists/:id/checked` | Limpar itens marcados |
| POST | `/generate` | Gerar lista a partir do planejamento `{ weekStart }` |

### Autenticadas — Histórico (`/api/user/history`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Histórico paginado (`?limit=&offset=`) |
| POST | `/` | Registrar preparo `{ recipeId, notes? }` |
| DELETE | `/:id` | Remover entrada |
| GET | `/stats/:recipeId` | Estatísticas de uma receita |
| GET | `/count` | Total de preparos |

### Autenticadas — Categorias (`/api/user/categories`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista categorias (cria padrões na primeira chamada) |
| POST | `/` | Criar categoria personalizada |
| PATCH | `/:id/toggle` | Ativar/desativar categoria |
| DELETE | `/:id` | Apagar categoria personalizada |

### Autenticadas — Social (`/api/recipes`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/` | Publicar receita no feed |
| DELETE | `/:id/publish` | Retirar receita do feed |
| GET | `/:id/ratings` | Avaliações de uma receita |
| POST | `/:id/ratings` | Enviar avaliação (0–5 estrelas + comentário) |
| POST | `/:id/flag` | Denunciar receita |

---

## Autenticação

Todas as rotas em `/api/user/` e as rotas autenticadas de `/api/recipes/` exigem o header:

```
Authorization: Bearer <Firebase ID Token>
```

O token é verificado consultando os certificados públicos do Google — sem necessidade de service account.
