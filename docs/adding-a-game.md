# Как добавить игру или уровень

Пошаговая инструкция для разработчика. Сначала описано, как изменить существующий уровень, потом — как добавить новую мини-игру целиком на примере игры «Циклы» с кодом `loops`.

## Содержание

- [Где что лежит](#где-что-лежит)
- [Изменить задание существующего уровня](#изменить-задание-существующего-уровня)
- [Добавить новую игру](#добавить-новую-игру)
  - [1. Backend: код игры и сиды](#1-backend-код-игры-и-сиды)
  - [2. Frontend: типы и справочники](#2-frontend-типы-и-справочники)
  - [3. Frontend: компонент игры](#3-frontend-компонент-игры)
  - [4. Frontend: маршрут](#4-frontend-маршрут)
  - [5. Frontend: цвет карточки](#5-frontend-цвет-карточки)
  - [6. Frontend: общее число уровней](#6-frontend-общее-число-уровней)
  - [7. Этап публикации](#7-этап-публикации)
  - [8. Проверка](#8-проверка)
- [Чек-лист](#чек-лист)
- [Ограничение: три уровня](#ограничение-три-уровня)

---

## Где что лежит

Список игр сейчас задан в нескольких местах, и все они должны совпадать **по составу и порядку**:

| Файл | Что хранит | Для чего |
|---|---|---|
| `backend/src/games/game-seeds.ts` | `GAME_CODES`, `GAME_SEEDS` | Коды игр, данные для таблиц `games` и `levels`, валидация DTO |
| `frontend/src/types/index.ts` | `GameCode`, `GameInfo['color']` | Типы на клиенте |
| `frontend/src/data/games.ts` | `games` | Карточки игр, порядок публикации |
| `frontend/src/context/ProgressContext.tsx` | `GAME_ORDER` | Порядок открытия игр на клиенте |
| `frontend/src/api/client.ts` | список в `isGameCode` | Фильтрация записей прогресса из ответа API |
| `frontend/src/pages/GamePage.tsx` | `switch (game.code)` | Какой компонент рендерить |
| `frontend/src/games/*.tsx` | `levels` внутри компонента | **Задания, которые реально видит пользователь** |

> [!IMPORTANT]
> Порядок игр на сервере определяется **двумя** вещами: полем `order` в `GAME_SEEDS` (по нему проверяется, открыта ли игра при сохранении) и порядком элементов в `GAME_CODES` (по нему строится `unlockedGames` в ответе `/api/progress`). Держи их согласованными.

---

## Изменить задание существующего уровня

Содержимое, которое видит пользователь, задано в компоненте игры. Например, в `frontend/src/games/ConditionsGame.tsx`:

```ts
const levels: Record<number, ConditionLevel> = {
  1: {
    title: 'Собираемся гулять',
    instruction: 'Прочитай условие и выбери подходящее действие.',
    questions: [
      { condition: 'ЕСЛИ на улице идёт дождь, ТО...', options: ['взять зонт', 'надеть панаму', 'взять мяч'], answer: 0 },
      // ...
    ],
  },
  // ...
};
```

1. Отредактируй объект `levels` в нужном компоненте.
2. Если меняются название или описание уровня, поправь заодно соответствующий уровень в `GAME_SEEDS` (`backend/src/games/game-seeds.ts`), чтобы данные в БД не расходились с клиентом.
3. Пересобери фронтенд. Backend перезапускать нужно только при изменении сидов: они применяются при старте.

Прогресс пользователей при этом сохраняется: записи в `user_progress` ссылаются на `levels.id`, а сидинг обновляет уровень по паре `(game_code, level_no)`, не меняя `id`.

---

## Добавить новую игру

### 1. Backend: код игры и сиды

В `backend/src/games/game-seeds.ts` добавь код **в конец** `GAME_CODES`:

```ts
export const GAME_CODES = ['sequence', 'robot', 'debugger', 'conditions', 'loops'] as const;
```

Тип `GameCode` выведется из массива автоматически. Также автоматически обновятся:

- валидация `CompleteLevelDto` (`@IsIn(GAME_CODES)`);
- проверка кода в `GamesService.findOne`.

Затем добавь игру в конец `GAME_SEEDS`:

```ts
{
  code: 'loops',
  title: 'Повторяй-ка',
  shortTitle: 'Циклы',
  description: 'Замечай повторяющиеся действия и сворачивай их в цикл.',
  icon: '🔁',
  color: 'pink',
  order: 5,
  levels: [
    {
      level: 1,
      title: 'Лестница',
      description: 'Сколько раз нужно повторить «шаг вверх»?',
      maxScore: 100,
      content: { action: 'шаг вверх', repeat: 4 },
    },
    {
      level: 2,
      title: 'Хоровод',
      description: 'Найди повторяющуюся часть алгоритма.',
      maxScore: 100,
      content: { steps: ['шаг', 'хлопок', 'шаг', 'хлопок'], pattern: ['шаг', 'хлопок'] },
    },
    {
      level: 3,
      title: 'Грядка',
      description: 'Составь цикл для посадки пяти семян.',
      maxScore: 100,
      content: { body: ['сделать ямку', 'положить семечко', 'засыпать'], repeat: 5 },
    },
  ],
},
```

Требования:

- `order` на единицу больше, чем у последней игры, и уникален (в таблице `games` на `order_no` стоит `UNIQUE`).
- Уровней **ровно три**, `level` — 1, 2, 3 (см. [ограничение](#ограничение-три-уровня)).
- `maxScore: 100`. Клиент всегда отправляет `maxScore: 100` (`useLevelCompletion.ts`), а сервер отклоняет запрос, если значение не совпадает с БД.
- Формат `content` произвольный: это `JSONB`. Хорошо описать его в [database.md](./database.md#структура-levelscontent).

После перезапуска backend игра и уровни появятся в БД.

### 2. Frontend: типы и справочники

**`frontend/src/types/index.ts`**: добавь код в тип и, если нужен новый цвет, в список цветов:

```ts
export type GameCode = 'sequence' | 'robot' | 'debugger' | 'conditions' | 'loops';

export interface GameInfo {
  // ...
  color: 'purple' | 'blue' | 'orange' | 'green' | 'pink';
}
```

**`frontend/src/data/games.ts`**: добавь карточку в конец массива `games`:

```ts
{
  code: 'loops',
  title: 'Повторяй-ка',
  shortTitle: 'Циклы',
  description: 'Замечай повторяющиеся действия и сворачивай их в цикл.',
  color: 'pink',
  path: '/games/loops/1',
},
```

**`frontend/src/context/ProgressContext.tsx`**: добавь код в порядок открытия:

```ts
const GAME_ORDER: GameCode[] = ['sequence', 'robot', 'debugger', 'conditions', 'loops'];
```

**`frontend/src/api/client.ts`**: добавь код в проверку `isGameCode`:

```ts
const isGameCode = (value: unknown): value is GameCode =>
  ['sequence', 'robot', 'debugger', 'conditions', 'loops'].includes(String(value));
```

> [!WARNING]
> Этот шаг легко пропустить, и TypeScript о нём не предупредит: список — обычный массив строк. Без него `normalizeRecords` молча отбросит все результаты новой игры, и пройденные уровни будут выглядеть непройденными.

Чтобы список не приходилось дублировать, его можно собрать из `GAME_ORDER` (например, вынести в `data/games.ts` и импортировать), но это уже рефакторинг.

### 3. Frontend: компонент игры

Создай `frontend/src/games/LoopsGame.tsx`. Все игры устроены одинаково:

- уровни описаны в объекте `levels`;
- `GameScaffold` рисует заголовок, хлебные крошки и выбор уровня;
- `useLevelCompletion` отправляет результат на сервер;
- `GameResult` показывает экран результата, кнопку «Следующий уровень» и повтор сохранения при ошибке.

Минимальный шаблон:

```tsx
import { useState } from 'react';
import { GameResult } from '../components/GameResult';
import { GameScaffold } from '../components/GameScaffold';
import { useLevelCompletion } from '../hooks/useLevelCompletion';

interface LoopsLevel {
  title: string;
  instruction: string;
  action: string;
  answer: number;
  options: number[];
}

const levels: Record<number, LoopsLevel> = {
  1: {
    title: 'Лестница',
    instruction: 'Посчитай, сколько раз нужно повторить действие.',
    action: 'шаг вверх',
    answer: 4,
    options: [3, 4, 5],
  },
  2: { /* ... */ },
  3: { /* ... */ },
};

export function LoopsGame({ level }: { level: number }) {
  const config = levels[level];
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const completion = useLevelCompletion('loops', level);

  const choose = (value: number) => {
    if (value === config.answer) {
      // Та же формула, что в остальных играх: штраф за ошибку, но не ниже 55.
      void completion.save(Math.max(55, 100 - mistakes * 15));
      return;
    }
    setMistakes((count) => count + 1);
    setFeedback('Посчитай ещё раз.');
  };

  if (completion.status !== 'idle') {
    return (
      <GameScaffold gameCode="loops" level={level} title={config.title} instruction={config.instruction}>
        <GameResult
          gameCode="loops"
          level={level}
          score={completion.score}
          status={completion.status}
          onRetrySave={() => void completion.save(completion.score)}
        />
      </GameScaffold>
    );
  }

  return (
    <GameScaffold gameCode="loops" level={level} title={config.title} instruction={config.instruction}>
      <p>Повторить «{config.action}» сколько раз?</p>
      <div className="condition-options">
        {config.options.map((value) => (
          <button type="button" key={value} onClick={() => choose(value)}>
            {value}
          </button>
        ))}
      </div>
      {feedback && <div className="game-feedback game-feedback--try">{feedback}</div>}
    </GameScaffold>
  );
}
```

Про очки:

- Сервер примет результат, только если `score >= 50` (половина от `maxScore = 100`). Остальные игры никогда не дают меньше **55**, поэтому уровень, решённый до конца, всегда засчитывается. Сохрани это свойство и в новой игре.
- В `GameScaffold` можно передать проп `side` с подсказкой справа, как в `ConditionsGame`.

### 4. Frontend: маршрут

В `frontend/src/pages/GamePage.tsx` добавь ветку в `switch`:

```tsx
import { LoopsGame } from '../games/LoopsGame';

// ...
switch (game.code) {
  // ...
  case 'loops':
    return <LoopsGame key={`${game.code}-${level}`} level={level} />;
}
```

`key` нужен, чтобы при переходе между уровнями компонент монтировался заново и его состояние сбрасывалось.

> [!WARNING]
> Если забыть этот шаг, TypeScript не предупредит: в `tsconfig` не включён `noImplicitReturns`, поэтому `GamePage` просто вернёт `undefined`, и страница уровня окажется пустой.

### 5. Frontend: цвет карточки

Если используется новый цвет, добавь CSS-классы в **оба** файла стилей. `material.css` подключается в `main.tsx` после `global.css` и переопределяет цвета карточек, поэтому правка только в `global.css` не будет видна.

`frontend/src/styles/global.css`:

```css
:root {
  --pink: #ef6fae;
}

.game-card--pink { --card-color: var(--pink); --card-soft: #ffe8f3; }
```

`frontend/src/styles/material.css`, рядом с остальными `.game-card--*`:

```css
.game-card--pink { --card-color: #9c4275; --card-soft: #ffd8ea; }
```

### 6. Frontend: общее число уровней

Страницы прогресса и профиля считают, что уровней всего **12** (4 игры × 3 уровня). С пятой игрой их станет 15:

| Файл | Что поменять |
|---|---|
| `frontend/src/pages/ProgressPage.tsx` | процент `completedCount / 12`, `ProgressBar max={12}`, текст «из 12 уровней», достижение «Всё пройдено» (`completedCount === 12`, «Завершить 12 уровней») |
| `frontend/src/pages/ProfilePage.tsx` | `{completedCount}/12` |

Надёжнее один раз заменить число на вычисление, тогда при следующей игре эти места трогать не придётся:

```ts
import { games } from '../data/games';

const LEVELS_PER_GAME = 3;
export const totalLevelCount = games.length * LEVELS_PER_GAME;
```

Для достижения лучше использовать `>=`, а не `===`.

### 7. Этап публикации

Опубликованные игры вычисляются в `data/games.ts`:

```ts
export const availableGames = games.slice(0, Math.max(0, releaseStage - 1));
```

При `releaseStage = 6` это `games.slice(0, 5)`, то есть пятая игра появится автоматически. Если нужно показывать её отдельным этапом, добавь этап `7` в `releaseInfo` (`frontend/src/config/release.ts`), и тогда проверки `releaseStage >= 6` в `App.tsx` и `MainLayout.tsx`, возможно, стоит сдвинуть.

### 8. Проверка

```bash
npm run dev
```

1. Зарегистрируйся и пройди третий уровень игры «Если — то»: новая игра должна открыться.
2. Пройди первый уровень новой игры и проверь, что результат виден на странице прогресса.
3. Проверь API напрямую:

```bash
curl http://localhost:3000/api/games/loops
```

```bash
curl -X POST http://localhost:3000/api/progress/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"gameCode":"loops","level":1,"score":85,"maxScore":100}'
```

4. Прогони тесты backend: `npm test`.

---

## Чек-лист

**Backend**

- [ ] Код добавлен в конец `GAME_CODES`
- [ ] Игра добавлена в `GAME_SEEDS` с уникальным `order`, тремя уровнями и `maxScore: 100`
- [ ] Формат `content` описан в `docs/database.md`

**Frontend**

- [ ] `GameCode` (и при необходимости `GameInfo['color']`) в `types/index.ts`
- [ ] Карточка в `data/games.ts`
- [ ] `GAME_ORDER` в `context/ProgressContext.tsx`
- [ ] `isGameCode` в `api/client.ts`
- [ ] Компонент в `games/`
- [ ] Ветка `case` в `pages/GamePage.tsx`
- [ ] CSS-классы для нового цвета в `global.css` и `material.css`
- [ ] Общее число уровней в `ProgressPage.tsx` и `ProfilePage.tsx`
- [ ] Этап публикации проверен

**Проверка**

- [ ] Игра открывается после 3-го уровня предыдущей
- [ ] Результат сохраняется и отображается в прогрессе
- [ ] `npm test` и `npm run build` проходят

---

## Ограничение: три уровня

Число уровней в игре не хранится в одном месте: значение 3 записано напрямую в коде. Чтобы сделать в игре 4 уровня и больше, нужно поменять:

| Файл | Что там |
|---|---|
| `backend/src/progress/progress.service.ts` | `unlockedGames`: проверка `:3`; `assertUnlocked`: `l.level_no = 3` |
| `frontend/src/context/ProgressContext.tsx` | `isGameUnlocked`: `bestFor(..., 3)` |
| `frontend/src/pages/GamePage.tsx` | `level > 3` |
| `frontend/src/components/LevelPicker.tsx` | `[1, 2, 3]` |
| `frontend/src/components/GameScaffold.tsx` | `Уровень {level} из 3` |
| `frontend/src/components/GameResult.tsx` | `isLast = level === 3` |
| `frontend/src/components/GameCard.tsx` | `3 уровня`, `max={3}` |
| `frontend/src/pages/ProgressPage.tsx` | `из 3 уровней`, а также общее число `12` |
| `frontend/src/pages/ProfilePage.tsx` | общее число `/12` |
| `frontend/src/pages/DashboardPage.tsx` | `availableGames.length * 3`, `count < 3` |
| `frontend/src/pages/RegisterPage.tsx` | `availableGames.length * 3` |

Правильное решение — хранить количество уровней в данных игры. Например, добавить поле `levelCount` в `GameInfo`, а на сервере брать `MAX(level_no)` из таблицы `levels` вместо константы 3. Тогда разные игры смогут иметь разное число уровней.

---

См. также: [REST API](./api.md) · [схема базы данных](./database.md) · [архитектура и деплой](./architecture.md)
