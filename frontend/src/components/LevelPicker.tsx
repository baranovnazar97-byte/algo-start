import { Link } from 'react-router-dom';
import type { GameCode } from '../types';
import { useProgress } from '../context/ProgressContext';

interface LevelPickerProps {
  gameCode: GameCode;
  currentLevel?: number;
}

export function LevelPicker({ gameCode, currentLevel }: LevelPickerProps) {
  const { bestFor, isLevelUnlocked } = useProgress();
  return (
    <div className="level-picker" aria-label="Выбор уровня">
      {[1, 2, 3].map((level) => {
        const record = bestFor(gameCode, level);
        const unlocked = isLevelUnlocked(gameCode, level);
        const content = (
          <>
            <span>{level}</span>
            <small>{record ? `${record.score} оч.` : `Уровень ${level}`}</small>
          </>
        );
        return unlocked ? (
          <Link
            key={level}
            to={`/games/${gameCode}/${level}`}
            className={`level-pill${record ? ' level-pill--done' : ''}${
              currentLevel === level ? ' level-pill--active' : ''
            }`}
          >
            {content}
          </Link>
        ) : (
          <span key={level} className="level-pill level-pill--locked">
            {content}
          </span>
        );
      })}
    </div>
  );
}
