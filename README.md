# Receitinha

Aplicativo mobile de receitas culinárias desenvolvido com React Native + Expo.

---

## Tecnologias

- **React Native 0.83** + **Expo 55** (bare workflow)
- **TypeScript**
- **Firebase Authentication** — autenticação de usuários
- **Firebase Firestore + Storage** — comunidade, avaliações e backup na nuvem
- **expo-sqlite** — banco de dados local (cache, despensa, histórico)
- **Cloudinary** — armazenamento de fotos de receitas
- **Zustand** — gerenciamento de estado global
- **React Hook Form** + **Zod** — validação de formulários
- **React Navigation** — navegação entre telas
- **expo-camera** — scanner de código de barras (Open Food Facts)
- **expo-speech / expo-speech-recognition** — TTS e comandos de voz (Modo Chef)
- **expo-video / expo-av** — reprodução de vídeos de preparo
- **expo-notifications + expo-task-manager + expo-location** — notificações por geofencing
- **expo-print + expo-sharing** — exportação de listas em PDF
- **receitinha-api** — backend próprio (Express + PostgreSQL) para scraping de receitas e endpoints sociais

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── common/          # FavoriteButton, SkeletonCard, LoadingOverlay, ErrorBoundary, ScreenHeader, QuickConverterModal
│   ├── forms/           # IngredientItem, StepItem, PhotoPicker, VideoPicker
│   ├── planning/        # WeekDayColumn, MealSlot
│   ├── recipe/          # RecipeForm, RecipeCard, CommunityRecipeCard, SuggestionCard,
│   │                    # NutritionCard, ServingsControl, VideoPlayer,
│   │                    # AddToCollectionModal, SubstitutionModal, SubstitutionBadge
│   ├── social/          # StarRating, RatingCard, RatingSummary, RateRecipeModal
│   └── timers/          # FloatingTimerWidget, TimerDrawer
├── constants/           # theme, categories, units
├── contexts/            # ThemeContext (dark mode + tamanho de fonte)
├── hooks/               # useServings, useWeekPlan, useRecipes, useTimer,
│                        # useBarcode, useDebounce, useRecipeStats, useVoiceControl
├── navigation/          # RootNavigator, AuthStack
├── screens/
│   ├── auth/            # Login, Register, ForgotPassword, Splash
│   ├── planning/        # WeekPlanScreen, RecipePickerModal
│   ├── recipes/         # RecipeList, Create, Edit, Favorites, CollectionDetail,
│   │                    # Cooking, ChefMode
│   ├── settings/        # Appearance, Categories, CookingHistory, Backup,
│   │                    # Converter, Substitutions
│   ├── shopping/        # ShoppingLists, ShoppingListDetail, BarcodeScanner,
│   │                    # BudgetReport, SpendingHistory
│   ├── social/          # CommunityFeed, PublicRecipe
│   └── suggestions/     # SuggestionsScreen
├── services/
│   ├── api/             # client (fetch wrapper), communityService, openFoodFacts
│   ├── firebase/        # auth, config, backupService
│   └── sqlite/          # database, recipeService, favoriteService, categoryService,
│                        # cookingHistoryService, shoppingService, planningService,
│                        # pantryService
│   ├── nutritionService.ts        # cálculo nutricional via tabela TACO
│   ├── suggestionService.ts       # sugestões pela despensa
│   ├── substitutionService.ts     # substituições de ingredientes
│   ├── exportService.ts           # geração de PDF
│   ├── notifications.ts           # geofencing + lembretes
│   └── permissions.ts
├── store/               # authStore, communityStore, settingsStore, timersStore
├── types/               # tipos globais
└── utils/               # formatters, errorHandler, ingredientCategorizer,
                         # measureConverter, densityTable, voiceCommands
```

---

## Configuração

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Suba o backend `receitinha-api` (ver README do backend) ou use o deploy público em `https://receitinha-api.onrender.com`.

3. Crie um arquivo `.env` na raiz com as variáveis:
   ```env
   EXPO_PUBLIC_API_URL=https://receitinha-api.onrender.com

   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...

   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
   ```

4. Inicie o projeto em modo desenvolvimento:
   ```bash
   npx expo start
   ```

---

## Build local do APK Android

O projeto está em bare workflow e possui a pasta `android/` configurada. Pré-requisitos: **JDK 17**, **Android SDK** com `ANDROID_HOME` configurado.

### APK Debug (precisa do Metro server rodando)
```bash
cd android
./gradlew assembleDebug
# Saída: android/app/build/outputs/apk/debug/app-debug.apk
```

### APK Release (standalone — bundle JS embutido)
```bash
cd android
./gradlew assembleRelease
# Saída: android/app/build/outputs/apk/release/app-release.apk
```

> ⚠️ O `build.gradle` está configurado para assinar o release com a debug keystore. Para distribuição em loja, gere uma keystore própria e ajuste `signingConfigs.release`.

---

## Product Backlog

> **30 requisitos funcionais** distribuídos em **3 sprints** — todos concluídos.

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
*GPS · Exportação · Vídeos · Acessibilidade · Voz · Extras*

| ID | Requisito | Prioridade | Dificuldade | Esforço | Status |
|----|-----------|------------|-------------|---------|--------|
| RF14 | Sugestão de receitas pelos ingredientes disponíveis | Média | Média | 3 dias | ✅ Concluído |
| RF19 | Notificações por localização — geofencing (GPS) | Baixa | Alta | 4 dias | ✅ Concluído |
| RF21 | Importação de receitas via URL (scraping) | Baixa | Alta | 4 dias | ✅ Concluído |
| RF22 | Exportação da lista de compras em PDF/texto | Média | Média | 2 dias | ✅ Concluído |
| RF23 | Vídeos de preparo: upload e reprodução | Baixa | Alta | 4 dias | ✅ Concluído |
| RF25 | Modo noturno e ajuste de tamanho de fonte | Média | Baixa | 2 dias | ✅ Concluído |
| RF26 | Relatório de gastos com compras | Baixa | Média | 3 dias | ✅ Concluído |
| RF27 | Dicas de substituição de ingredientes | Baixa | Baixa | 2 dias | ✅ Concluído |
| RF28 | Timer simultâneo para várias receitas | Baixa | Média | 2 dias | ✅ Concluído |
| RF29 | Integração com assistente de voz (Modo Chef) | Baixa | Alta | 3 dias | ✅ Concluído |
| RF30 | Modo "Chef" — tela cheia com preparo simplificado | Baixa | Baixa | 1 dia | ✅ Concluído |

**Entrega:** App completo — sugestões inteligentes pela despensa, notificações por geofencing, scraping de receitas de sites populares (TudoGostoso, Receitas Nestlé, Panelinha, Guia da Cozinha), exportação em PDF, vídeos de preparo, dark mode com ajuste de fonte, relatório de gastos, dicas de substituição, múltiplos timers simultâneos com widget flutuante e Modo Chef com comandos de voz (próximo, anterior, repetir, iniciar timer).

---

## Modo Chef

Tela em fullscreen otimizada para uso durante o preparo:

- **Brilho automático** no máximo (volta ao normal ao sair)
- **Keep awake** — tela não desliga
- **Texto gigante** com swipe lateral para navegar entre passos
- **Timer por etapa** com flash visual e haptic ao terminar
- **Comandos de voz em pt-BR**: "próximo", "anterior", "repetir", "iniciar timer", "pausar"
- **TTS (text-to-speech)** lê o passo quando solicitado
- O microfone pausa automaticamente enquanto o TTS fala (evita auto-recognição)

---

## Receitinha API

O backend público está em `https://receitinha-api.onrender.com` e implementa:

- `/api/scrape` — scraping de receitas dos domínios permitidos (com detecção automática de charset)
- `/api/community` — feed, avaliações e comentários
- `/api/scrape/test-encoding` — endpoint de diagnóstico de encoding

Código-fonte em [receitinha-api/](receitinha-api/).
