export const GAME_CODES = ['sequence', 'robot', 'debugger', 'conditions'] as const;
export type GameCode = (typeof GAME_CODES)[number];

interface LevelSeed {
  level: number;
  title: string;
  description: string;
  maxScore: number;
  content: Record<string, unknown>;
}

interface GameSeed {
  code: GameCode;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  levels: LevelSeed[];
}

export const GAME_SEEDS: GameSeed[] = [
  {
    code: 'sequence',
    title: 'Шаг за шагом',
    shortTitle: 'Последовательности',
    description: 'Расставляй действия в правильном порядке.',
    icon: '🧩',
    color: 'purple',
    order: 1,
    levels: [
      {
        level: 1,
        title: 'Собираемся в школу',
        description: 'Расположи утренние действия по порядку.',
        maxScore: 100,
        content: {
          items: ['Проснуться', 'Умыться', 'Позавтракать', 'Взять рюкзак'],
        },
      },
      {
        level: 2,
        title: 'Готовим бутерброд',
        description: 'Составь алгоритм приготовления бутерброда.',
        maxScore: 100,
        content: {
          items: ['Взять хлеб', 'Положить сыр', 'Добавить овощи', 'Накрыть хлебом'],
        },
      },
      {
        level: 3,
        title: 'Сажаем цветок',
        description: 'Восстанови последовательность посадки цветка.',
        maxScore: 100,
        content: {
          items: ['Насыпать землю', 'Сделать ямку', 'Посадить семечко', 'Полить'],
        },
      },
    ],
  },
  {
    code: 'robot',
    title: 'Робот-почтальон',
    shortTitle: 'Команды роботу',
    description: 'Составляй маршрут и помогай роботу дойти до цели.',
    icon: '🤖',
    color: 'blue',
    order: 2,
    levels: [
      {
        level: 1,
        title: 'Первая посылка',
        description: 'Проведи робота по прямой дороге.',
        maxScore: 100,
        content: { width: 4, height: 3, start: [0, 1], target: [3, 1], obstacles: [] },
      },
      {
        level: 2,
        title: 'Поворот во дворе',
        description: 'Используй повороты, чтобы доставить посылку.',
        maxScore: 100,
        content: { width: 4, height: 4, start: [0, 3], target: [3, 0], obstacles: [] },
      },
      {
        level: 3,
        title: 'Обход препятствия',
        description: 'Обойди закрытую клетку и найди адрес.',
        maxScore: 100,
        content: { width: 5, height: 4, start: [0, 2], target: [4, 1], obstacles: [[2, 2]] },
      },
    ],
  },
  {
    code: 'debugger',
    title: 'Ловец ошибок',
    shortTitle: 'Исправление ошибок',
    description: 'Находи лишний или неправильный шаг алгоритма.',
    icon: '🔎',
    color: 'orange',
    order: 3,
    levels: [
      {
        level: 1,
        title: 'Чай с ошибкой',
        description: 'Найди действие, которое мешает приготовить чай.',
        maxScore: 100,
        content: {
          steps: ['Налить воду', 'Включить чайник', 'Положить чай в чашку', 'Убрать чашку в шкаф'],
          wrongStep: 3,
        },
      },
      {
        level: 2,
        title: 'Потерянный шаг',
        description: 'Выбери пропущенный шаг чистки зубов.',
        maxScore: 100,
        content: {
          steps: ['Взять щётку', 'Нанести пасту', 'Почистить зубы', 'Прополоскать рот'],
          missingStep: 'Нанести пасту',
        },
      },
      {
        level: 3,
        title: 'Неверная команда',
        description: 'Исправь маршрут игрушечной машинки.',
        maxScore: 100,
        content: { commands: ['вперёд', 'вперёд', 'назад', 'вправо'], wrongStep: 2 },
      },
    ],
  },
  {
    code: 'conditions',
    title: 'Если — то',
    shortTitle: 'Условия',
    description: 'Выбирай действие, которое подходит к условию.',
    icon: '🌦️',
    color: 'green',
    order: 4,
    levels: [
      {
        level: 1,
        title: 'Погода',
        description: 'Что взять, если на улице дождь?',
        maxScore: 100,
        content: { condition: 'Идёт дождь', options: ['Зонт', 'Мяч', 'Санки'], answer: 0 },
      },
      {
        level: 2,
        title: 'Светофор',
        description: 'Что делать, если горит красный свет?',
        maxScore: 100,
        content: { condition: 'Красный свет', options: ['Ждать', 'Бежать', 'Прыгать'], answer: 0 },
      },
      {
        level: 3,
        title: 'Заряд робота',
        description: 'Выбери действие при низком заряде.',
        maxScore: 100,
        content: {
          condition: 'Заряд меньше 20%',
          options: ['Подключить зарядку', 'Включить музыку', 'Продолжать путь'],
          answer: 0,
        },
      },
    ],
  },
];
