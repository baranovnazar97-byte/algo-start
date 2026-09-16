import { Navigate, useParams } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { gameByCode, isGamePublished } from '../data/games';
import { ConditionsGame } from '../games/ConditionsGame';
import { DebuggerGame } from '../games/DebuggerGame';
import { RobotGame } from '../games/RobotGame';
import { SequenceGame } from '../games/SequenceGame';

export function GamePage() {
  const { gameCode, level: levelParam } = useParams();
  const game = gameByCode(gameCode);
  const level = Number(levelParam);
  const { isGameUnlocked, isLevelUnlocked, isLoading } = useProgress();

  if (!game || !isGamePublished(game.code) || !Number.isInteger(level) || level < 1 || level > 3) {
    return <Navigate to="/games" replace />;
  }

  if (isLoading) {
    return <div className="page-loader"><span className="loader" /><p>Загружаем уровень...</p></div>;
  }

  if (!isGameUnlocked(game.code) || !isLevelUnlocked(game.code, level)) {
    return <Navigate to="/games" replace />;
  }

  switch (game.code) {
    case 'sequence':
      return <SequenceGame key={`${game.code}-${level}`} level={level} />;
    case 'robot':
      return <RobotGame key={`${game.code}-${level}`} level={level} />;
    case 'debugger':
      return <DebuggerGame key={`${game.code}-${level}`} level={level} />;
    case 'conditions':
      return <ConditionsGame key={`${game.code}-${level}`} level={level} />;
  }
}
