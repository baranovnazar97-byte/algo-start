import { GameCard } from '../components/GameCard';
import { useProgress } from '../context/ProgressContext';
import { availableGames } from '../data/games';

export function GamesPage() {
  const { records, isGameUnlocked } = useProgress();
  return (
    <section className="page-section">
      <div className="container">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">Игровая карта</span>
          <h1>Выбери приключение</h1>
          <p>Проходи игры по порядку: каждая учит новому приёму.</p>
        </div>
        <div className="journey-line" aria-hidden="true">
          {availableGames.map((game, index) => (
            <span key={game.code}>{index + 1}</span>
          ))}
        </div>
        <div className="game-grid game-grid--large">
          {availableGames.map((game) => (
            <GameCard
              key={game.code}
              game={game}
              completedLevels={
                new Set(
                  records.filter((record) => record.gameCode === game.code).map((item) => item.level),
                ).size
              }
              locked={!isGameUnlocked(game.code)}
            />
          ))}
        </div>
        <div className="tip-card">
          <p>
            <strong>Совет:</strong> если задача не получилась с первого раза - попробуй изменить
            один шаг. Именно так программисты находят решения!
          </p>
        </div>
      </div>
    </section>
  );
}
