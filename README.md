# Receitinha

Aplicativo mobile de receitas culinárias desenvolvido com React Native + Expo.

---

## Tecnologias

- **React Native** + **Expo**
- **Firebase Authentication** — autenticação de usuários
- **Cloudinary** — armazenamento de fotos
- **Zustand** — gerenciamento de estado global
- **React Hook Form** + **Zod** — validação de formulários
- **React Navigation** — navegação entre telas
- **receitinha-api** — backend próprio (Express + PostgreSQL) para persistência de todos os dados do usuário e funcionalidades sociais

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── common/          # FavoriteButton, SkeletonCard, ServingsControl
│   ├── forms/           # IngredientItem, StepItem, PhotoPicker
│   ├── planning/        # WeekDayColumn, MealSlot
│   └── recipe/          # RecipeForm, AddToCollectionModal
├── constants/           # theme
├── hooks/               # useServings, useWeekPlan
├── screens/
│   ├── auth/            # Login, Register, ForgotPassword
│   ├── planning/        # WeekPlanScreen
│   ├── recipes/         # RecipeList, RecipeDetail, Create, Edit, Favorites, CollectionDetail
│   ├── settings/        # Profile, Categories, CookingHistory
│   ├── shopping/        # ShoppingListScreen, ShoppingListDetailScreen
│   └── social/          # CommunityFeedScreen, PublicRecipeScreen
├── services/
│   ├── api/             # client (fetch wrapper), communityService
│   ├── firebase/        # auth, config
│   └── sqlite/          # recipeService, favoriteService, categoryService,
│                        # cookingHistoryService, shoppingService, planningService
│                        # (todos fazem chamadas REST ao backend)
├── store/               # authStore, communityStore
├── types/               # tipos globais
└── utils/               # formatters, errorHandler, ingredientCategorizer
```

---

## Configuração

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Suba o backend `receitinha-api` (ver README do backend).

3. Crie um arquivo `.env` na raiz com as variáveis:
   ```env
   EXPO_PUBLIC_API_URL=http://<ip-da-maquina>:3000
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
   ```

4. Configure o Firebase em `src/services/firebase/` com seu `google-services.json` (Android) ou `GoogleService-Info.plist` (iOS).

5. Inicie o projeto:
   ```bash
   npx expo start
   ```

---

## Product Backlog

> **28 requisitos funcionais** distribuídos em **3 sprints**.

### Sprint 1 — Foundation & Core UX
*Auth · Receitas · Busca · Favoritos · Preparo · Porções · Categorias*

| ID | Requisito | Prioridade | Dificuldade | Esforço | Status |
|----|-----------|------------|-------------|---------|--------|
| RF01 | Cadastro e autenticação de usuário | Alta | Média | 3 dias | ✅ Concluído |
| RF02 | Cadastro manual de receitas (formulário + foto) | Alta | Alta | 5 dias | ✅ Concluído |
| RF03 | Busca por nome, ingrediente ou categoria + filtros | Alta | Média | 3 dias | ✅ Concluído |
| RF04 | Favoritar receitas e criar coleções personalizadas | Alta | Baixa | 2 dias | ✅ Concluído |
| RF08 | Modo de preparo interativo com timer por etapa | Alta | Média | 3 dias | ✅ Concluído |
| RF09 | Ajuste automático de quantidades por porções | Alta | Baixa | 2 dias | ✅ Concluído |
| RF24 | Categorias personalizáveis para receitas | Média | Baixa | 2 dias | ✅ Concluído |

**Entrega:** O usuário cria conta, cadastra uma receita com foto, busca, favorita, executa o preparo passo a passo com timer e ajusta as porções.

---

### Sprint 2 — Planejamento, Sensores & Social
*Câmera · Planejamento · Listas · Nutrição · Comunidade · Histórico*

| ID | Requisito | Prioridade | Dificuldade | Esforço | Status |
|----|-----------|------------|-------------|---------|--------|
| RF07 | Scanner de código de barras (câmera + Open Food Facts) | Alta | Alta | 4 dias | ✅ Concluído |
| RF05 | Planejamento semanal de refeições + refeições extras e reordenação | Alta | Alta | 5 dias | ✅ Concluído |
| RF06 | Geração automática de lista de compras a partir do planejamento | Alta | Média | 3 dias | ✅ Concluído |
| RF10 | Cálculo de informações nutricionais (tabela TACO) | Média | Média | 3 dias | ✅ Concluído |
| RF11 | Compartilhamento de receitas com a comunidade | Média | Alta | 5 dias | ✅ Concluído |
| RF12 | Avaliações e comentários em receitas públicas | Média | Média | 3 dias | ✅ Concluído |
| RF13 | Histórico de receitas preparadas com notas pessoais | Média | Baixa | 2 dias | ✅ Concluído |
| RF16 | Backup e restauração de dados na nuvem | Média | Alta | 4 dias | ✅ Concluído |
| RF17 | Conversor de medidas culinárias | Média | Baixa | 2 dias | ✅ Concluído |
| RF20 | Múltiplas listas de compras com duplicação | Média | Baixa | 2 dias | ✅ Concluído |

**Entrega:** Sprint 2 completa — planejamento semanal com slots personalizados, lista de compras automática, scanner de código de barras, nutrição por porção (tabela TACO), conversor de medidas, feed social com avaliações, histórico e todos os dados sincronizados na nuvem.

---

### Sprint 3 — Features Avançadas & Polish
*GPS · Exportação · Vídeos · Acessibilidade · Extras*

| ID | Requisito | Prioridade | Dificuldade | Esforço | Status |
|----|-----------|------------|-------------|---------|--------|
| RF22 | Exportação da lista de compras em PDF/texto | Média | Média | 2 dias | 🔲 Pendente |
| RF25 | Modo noturno e ajuste de tamanho de fonte | Média | Baixa | 2 dias | 🔲 Pendente |
| RF14 | Sugestão de receitas pelos ingredientes disponíveis | Média | Média | 3 dias | 🔲 Pendente |
| RF27 | Dicas de substituição de ingredientes | Baixa | Baixa | 2 dias | 🔲 Pendente |
| RF28 | Timer simultâneo para várias receitas | Baixa | Média | 2 dias | 🔲 Pendente |
| RF30 | Modo "Chef" — tela cheia com preparo simplificado | Baixa | Baixa | 1 dia | 🔲 Pendente |
| RF19 | Notificações por localização — geofencing (GPS) | Baixa | Alta | 4 dias | 🔲 Pendente |
| RF21 | Importação de receitas via URL (scraping) | Baixa | Alta | 4 dias | 🔲 Pendente |
| RF23 | Vídeos de preparo: upload e reprodução | Baixa | Alta | 4 dias | 🔲 Pendente |
| RF26 | Relatório de gastos com compras | Baixa | Média | 3 dias | 🔲 Pendente |
| RF29 | Integração com assistente de voz (opcional) | Baixa | Alta | 3 dias | 🔲 Pendente |

**Entrega:** App completo e polido, com GPS, exportação, vídeos, acessibilidade e todas as features de nicho funcionando.

---
