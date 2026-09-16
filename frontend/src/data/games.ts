import type { GameCode, GameInfo } from '../types';
import { releaseStage } from '../config/release';

export const games: GameInfo[] = [
  {
    code: 'sequence',
    title: 'Шаг за шагом',
    shortTitle: 'Последовательности',
    description: 'Расставляй действия в правильном порядке.',
    color: 'purple',
    path: '/games/sequence/1',
  },
  {
    code: 'robot',
    title: 'Робот-почтальон',
    shortTitle: 'Команды роботу',
    description: 'Составляй маршрут и помогай роботу дойти до цели.',
    color: 'blue',
    path: '/games/robot/1',
  },
  {
    code: 'debugger',
    title: 'Ловец ошибок',
    shortTitle: 'Исправление ошибок',
    description: 'Находи лишний или неправильный шаг алгоритма.',
    color: 'orange',
    path: '/games/debugger/1',
  },
  {
    code: 'conditions',
    title: 'Если - то',
    shortTitle: 'Условия',
    description: 'Выбирай действие, которое подходит к условию.',
    color: 'green',
    path: '/games/conditions/1',
  },
];

// Stage 1 is the application foundation. Every next stage publishes one game.
export const availableGames = games.slice(0, Math.max(0, releaseStage - 1));

export const isGamePublished = (code: GameCode) =>
  availableGames.some((game) => game.code === code);

export const gameByCode = (code: string | undefined) =>
  games.find((game) => game.code === code);

export const gameIndex = (code: GameCode) =>
  games.findIndex((game) => game.code === code);
