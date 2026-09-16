import { Link } from 'react-router-dom';
import type { GameCode } from '../types';

interface GameResultProps {
  gameCode: GameCode;
  level: number;
  score: number;
  status: 'saving' | 'saved' | 'error';
  onRetrySave: () => void;
}

export function GameResult({ gameCode, level, score, status, onRetrySave }: GameResultProps) {
  const isLast = level === 3;
  return (
    <div className="result-card" role="status" aria-live="polite">
      <h2>{status === 'error' ? 'Задание решено!' : 'Отличная работа!'}</h2>
      <p>
        Ты заработал <strong>{score} очков</strong>
      </p>
      {status === 'saving' && <p className="muted">Сохраняем результат...</p>}
      {status === 'error' && (
        <div className="inline-alert inline-alert--error">
          Не удалось сохранить результат. Проверь интернет и попробуй снова.
        </div>
      )}
      <div className="result-card__actions">
        {status === 'error' ? (
          <button className="button button--primary" type="button" onClick={onRetrySave}>
            Сохранить ещё раз
          </button>
        ) : status === 'saved' ? (
          <>
            {isLast ? (
              <Link className="button button--primary" to="/games">
                К другим играм
              </Link>
            ) : (
              <Link className="button button--primary" to={`/games/${gameCode}/${level + 1}`}>
                Следующий уровень
              </Link>
            )}
            <Link className="button button--ghost" to="/dashboard">
              На главную
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
