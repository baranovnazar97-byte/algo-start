import { Link } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { availableGames } from '../data/games';
import { releaseInfo, releaseStage } from '../config/release';

export function DashboardPage() {
  const { user } = useAuth();
  const { records, totalScore, error, isLoading, isGameUnlocked } = useProgress();
  const publishedLevelCount = availableGames.length * 3;
  const publishedCompletedCount = new Set(
    records
      .filter((record) => availableGames.some((game) => game.code === record.gameCode))
      .map((record) => `${record.gameCode}-${record.level}`),
  ).size;
  const firstIncomplete = availableGames.find((game) => {
    const count = new Set(
      records.filter((item) => item.gameCode === game.code).map((item) => item.level),
    ).size;
    return isGameUnlocked(game.code) && count < 3;
  });
  const nextLevel = firstIncomplete
    ? Math.min(
        3,
        new Set(
          records.filter((item) => item.gameCode === firstIncomplete.code).map((item) => item.level),
        ).size + 1,
      )
    : 1;

  return (
    <section className="page-section dashboard">
      <div className="container">
        <div className="dashboard__welcome">
          <div>
            <span className="eyebrow">Твоя игровая</span>
            <h1>Привет, {user?.name.split(' ')[0]}!</h1>
            <p>Каждый решённый уровень делает твоё мышление сильнее.</p>
          </div>
          <div className="score-chip">
            <div>
              <strong>{totalScore}</strong>
              <small>очков</small>
            </div>
          </div>
        </div>

        {error && <div className="inline-alert inline-alert--error">{error}</div>}
        {isLoading && <div className="inline-alert">Обновляем твой прогресс...</div>}

        <div className="dashboard__summary">
          <div className="summary-card summary-card--main">
            <div>
              <div>
                <span className="eyebrow">Общий прогресс</span>
                <h2>{publishedLevelCount === 0 ? 'Основа приложения готова' : publishedCompletedCount === publishedLevelCount ? 'Все доступные уровни пройдены!' : 'Ты на верном пути'}</h2>
              </div>
            </div>
            <ProgressBar value={publishedCompletedCount} max={Math.max(1, publishedLevelCount)} showValue />
            <p>{publishedLevelCount === 0 ? releaseInfo[releaseStage as keyof typeof releaseInfo].description : `${publishedCompletedCount} из ${publishedLevelCount} уровней завершено`}</p>
          </div>
          <div className="summary-card">
            <strong>{publishedCompletedCount}</strong>
            <span>уровней пройдено</span>
          </div>
          <div className="summary-card">
            <strong>{availableGames.filter((game) => isGameUnlocked(game.code)).length}</strong>
            <span>игр открыто</span>
          </div>
        </div>

        {firstIncomplete ? (
          <div className="continue-card">
            <div className="continue-card__copy">
              <span className="eyebrow">Продолжить обучение</span>
              <h2>{firstIncomplete.title}</h2>
              <p>Следующий шаг - уровень {nextLevel}. У тебя всё получится!</p>
            </div>
            <Link
              className="button button--primary"
              to={`/games/${firstIncomplete.code}/${nextLevel}`}
            >
              Продолжить
            </Link>
          </div>
        ) : publishedLevelCount > 0 ? (
          <div className="continue-card">
            <div className="continue-card__copy">
              <span className="eyebrow">Поздравляем</span>
              <h2>Ты прошёл весь тренажёр!</h2>
              <p>Можно повторить любую игру и улучшить результат.</p>
            </div>
            <Link className="button button--primary" to="/games">
              Играть снова
            </Link>
          </div>
        ) : (
          <div className="continue-card">
            <div className="continue-card__copy">
              <span className="eyebrow">Первый этап</span>
              <h2>Личный кабинет подключён</h2>
              <p>Игровые задания появятся на следующем этапе.</p>
            </div>
          </div>
        )}

        {availableGames.length > 0 && (
          <>
            <div className="section-heading section-heading--row">
              <div>
                <span className="eyebrow">Твои задания</span>
                <h2>Игры</h2>
              </div>
              <Link className="text-link" to="/games">Все игры</Link>
            </div>
            <div className="game-grid game-grid--dashboard">
              {availableGames.map((game) => (
                <GameCard
                  key={game.code}
                  game={game}
                  completedLevels={
                    new Set(
                      records
                        .filter((record) => record.gameCode === game.code)
                        .map((item) => item.level),
                    ).size
                  }
                  locked={!isGameUnlocked(game.code)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
