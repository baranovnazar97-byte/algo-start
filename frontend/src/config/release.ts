/**
 * Published demonstration stage. The stage-*.cmd scripts update this value.
 * Keep the full local project at stage 6 between demonstrations.
 */
export const releaseStage: number = 1;

export const releaseInfo = {
  1: {
    title: 'Основа проекта',
    description: 'Готовы регистрация, вход, база данных и личный кабинет.',
  },
  2: {
    title: 'Последовательности',
    description: 'Добавлена первая игра с заданиями на правильный порядок действий.',
  },
  3: {
    title: 'Команды роботу',
    description: 'Добавлена игра с построением маршрута для робота.',
  },
  4: {
    title: 'Поиск ошибок',
    description: 'Добавлена игра для поиска неправильных шагов алгоритма.',
  },
  5: {
    title: 'Условия',
    description: 'Добавлена четвёртая игра с конструкциями «если - то».',
  },
  6: {
    title: 'Полная версия',
    description: 'Добавлены подробный прогресс, достижения и профиль игрока.',
  },
} as const;
