import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { ProgressBar } from '../components/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { games } from '../data/games';

export function ProgressPage() {
  const { user } = useAuth();
  const { records, totalScore, completedCount, isGameUnlocked } = useProgress();
  const percent = Math.round((completedCount / 12) * 100);

  return (
    <section className="page-section">
      <div className="container progress-page">
        <div className="section-heading">
          <span className="eyebrow">Личные достижения</span>
          <h1>Прогресс {user?.name.split(' ')[0]}</h1>
          <p>Здесь видно, сколько уже сделано и что ждёт впереди.</p>
        </div>
        <div className="progress-hero">
          <div className="progress-hero__badge">
            <strong>{percent}%</strong>
          </div>
          <div className="progress-hero__main">
            <h2>{completedCount < 4 ? 'Начинающий алгоритмист' : completedCount < 9 ? 'Ловкий исследователь' : 'Мастер алгоритмов'}</h2>
            <ProgressBar value={completedCount} max={12} showValue />
            <p>{completedCount} из 12 уровней, {totalScore} очков</p>
          </div>
        </div>

        <div className="achievement-grid">
          <article className={completedCount >= 1 ? 'achievement achievement--earned' : 'achievement'}>
            <div><h3>Первый шаг</h3><p>Пройти первый уровень</p></div>
          </article>
          <article className={totalScore >= 300 ? 'achievement achievement--earned' : 'achievement'}>
            <div><h3>300 очков</h3><p>Собрать 300 очков</p></div>
          </article>
          <article className={completedCount === 12 ? 'achievement achievement--earned' : 'achievement'}>
            <div><h3>Всё пройдено</h3><p>Завершить 12 уровней</p></div>
          </article>
        </div>

        <div className="progress-list">
          {games.map((game) => {
            const completed = new Set(
              records.filter((item) => item.gameCode === game.code).map((item) => item.level),
            ).size;
            const unlocked = isGameUnlocked(game.code);
            return (
              <article className={`progress-game${!unlocked ? ' progress-game--locked' : ''}`} key={game.code}>
                <div className="progress-game__info">
                  <h2>{game.title}</h2>
                  <p>{unlocked ? `${completed} из 3 уровней` : 'Пока закрыто'}</p>
                  {unlocked && <LevelPicker gameCode={game.code} />}
                </div>
                {unlocked && (
                  <Link className="button button--soft" to={game.path}>
                    {completed ? 'Повторить' : 'Играть'}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
