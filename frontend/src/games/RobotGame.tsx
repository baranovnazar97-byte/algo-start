import { useState } from 'react';
import { GameResult } from '../components/GameResult';
import { GameScaffold } from '../components/GameScaffold';
import { useLevelCompletion } from '../hooks/useLevelCompletion';

type Direction = 'up' | 'down' | 'left' | 'right';
type Point = [number, number];

interface RobotLevel {
  title: string;
  instruction: string;
  size: number;
  start: Point;
  goal: Point;
  obstacles: Point[];
  maxCommands: number;
}

const levels: Record<number, RobotLevel> = {
  1: {
    title: 'Письмо для Лисы',
    instruction: 'Составь маршрут от робота до конверта. Избегай камней.',
    size: 4,
    start: [3, 0],
    goal: [0, 3],
    obstacles: [[2, 1], [1, 1]],
    maxCommands: 6,
  },
  2: {
    title: 'Посылка на холме',
    instruction: 'Доведи робота до посылки. На кусты наступать нельзя.',
    size: 5,
    start: [4, 0],
    goal: [0, 4],
    obstacles: [[3, 0], [2, 1], [1, 2]],
    maxCommands: 8,
  },
  3: {
    title: 'Секретный маршрут',
    instruction: 'Найди путь через лабиринт и доставь звезду.',
    size: 5,
    start: [4, 0],
    goal: [0, 4],
    obstacles: [[3, 1], [1, 0], [1, 1], [1, 2], [2, 4]],
    maxCommands: 8,
  },
};

const directionInfo: Record<Direction, { label: string; delta: Point }> = {
  up: { label: 'Вверх', delta: [-1, 0] },
  down: { label: 'Вниз', delta: [1, 0] },
  left: { label: 'Влево', delta: [0, -1] },
  right: { label: 'Вправо', delta: [0, 1] },
};

const samePoint = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

export function RobotGame({ level }: { level: number }) {
  const config = levels[level];
  const [commands, setCommands] = useState<Direction[]>([]);
  const [robot, setRobot] = useState<Point>(config.start);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const completion = useLevelCompletion('robot', level);

  const addCommand = (direction: Direction) => {
    if (commands.length >= config.maxCommands) {
      setFeedback(`В программе может быть не больше ${config.maxCommands} команд.`);
      return;
    }
    setCommands((current) => [...current, direction]);
    setRobot(config.start);
    setFeedback('');
  };

  const run = () => {
    let current: Point = [...config.start];
    for (let index = 0; index < commands.length; index += 1) {
      const delta = directionInfo[commands[index]].delta;
      const next: Point = [current[0] + delta[0], current[1] + delta[1]];
      const outside = next[0] < 0 || next[1] < 0 || next[0] >= config.size || next[1] >= config.size;
      const hitObstacle = config.obstacles.some((point) => samePoint(point, next));
      if (outside || hitObstacle) {
        setRobot(current);
        setMistakes((value) => value + 1);
        setFeedback(`Команда ${index + 1} ведёт ${outside ? 'за край карты' : 'прямо в препятствие'}. Исправь маршрут.`);
        return;
      }
      current = next;
    }
    setRobot(current);
    if (samePoint(current, config.goal)) {
      void completion.save(Math.max(55, 100 - mistakes * 15));
    } else {
      setMistakes((value) => value + 1);
      setFeedback('Робот остановился раньше цели. Добавь ещё команды.');
    }
  };

  if (completion.status !== 'idle') {
    return (
      <GameScaffold gameCode="robot" level={level} title={config.title} instruction={config.instruction}>
        <GameResult gameCode="robot" level={level} score={completion.score} status={completion.status} onRetrySave={() => void completion.save(completion.score)} />
      </GameScaffold>
    );
  }

  return (
    <GameScaffold
      gameCode="robot"
      level={level}
      title={config.title}
      instruction={config.instruction}
      side={
        <div className="helper-card">
          <h3>Задача</h3>
          <p>Доберись до цели не больше чем за {config.maxCommands} команд.</p>
        </div>
      }
    >
      <div className="robot-workspace">
        <div className="robot-grid" style={{ gridTemplateColumns: `repeat(${config.size}, 1fr)` }}>
          {Array.from({ length: config.size * config.size }, (_, index) => {
            const point: Point = [Math.floor(index / config.size), index % config.size];
            const isRobot = samePoint(point, robot);
            const isGoal = samePoint(point, config.goal);
            const isObstacle = config.obstacles.some((obstacle) => samePoint(point, obstacle));
            return (
              <div className={`robot-cell${isGoal ? ' robot-cell--goal' : ''}${isObstacle ? ' robot-cell--obstacle' : ''}`} key={index}>
                {isObstacle ? 'Стена' : isRobot ? 'Робот' : isGoal ? 'Цель' : ''}
              </div>
            );
          })}
        </div>
        <div className="robot-program">
          <div className="robot-program__heading">
            <strong>Твоя программа</strong>
            <span>{commands.length}/{config.maxCommands}</span>
          </div>
          <div className="command-buttons">
            {(Object.keys(directionInfo) as Direction[]).map((direction) => (
              <button key={direction} type="button" onClick={() => addCommand(direction)} title={directionInfo[direction].label}>
                {directionInfo[direction].label}
              </button>
            ))}
          </div>
          <div className="command-line">
            {commands.length === 0 ? (
              <span className="muted">Выбери команды для маршрута</span>
            ) : commands.map((command, index) => (
              <span key={`${command}-${index}`}>{directionInfo[command].label}</span>
            ))}
          </div>
          <div className="robot-program__actions">
            <button className="button button--ghost button--small" type="button" disabled={!commands.length} onClick={() => { setCommands((current) => current.slice(0, -1)); setRobot(config.start); setFeedback(''); }}>
              Убрать шаг
            </button>
            <button className="button button--primary button--small" type="button" disabled={!commands.length} onClick={run}>
              Запустить
            </button>
          </div>
        </div>
      </div>
      {feedback && <div className="game-feedback game-feedback--try">{feedback}</div>}
    </GameScaffold>
  );
}
