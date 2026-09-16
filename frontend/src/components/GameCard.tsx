import { Link } from 'react-router-dom';
import type { GameInfo } from '../types';
import { ProgressBar } from './ProgressBar';

interface GameCardProps {
  game: GameInfo;
  completedLevels?: number;
  locked?: boolean;
  compact?: boolean;
}

export function GameCard({
  game,
  completedLevels = 0,
  locked = false,
  compact = false,
}: GameCardProps) {
  return (
    <article className={`game-card game-card--${game.color}${locked ? ' game-card--locked' : ''}`}>
      <div className="game-card__top">
        <span className="game-card__tag">3 уровня</span>
      </div>
      <div>
        <h3>{game.title}</h3>
        <p>{game.description}</p>
      </div>
      {!compact && (
        <ProgressBar value={completedLevels} max={3} label={`${completedLevels} из 3 пройдено`} />
      )}
      {locked ? (
        <span className="game-card__locked-text">Пройди предыдущую игру</span>
      ) : (
        <Link className="button button--soft game-card__button" to={game.path}>
          {completedLevels > 0 ? 'Продолжить' : 'Играть'}
        </Link>
      )}
    </article>
  );
}
