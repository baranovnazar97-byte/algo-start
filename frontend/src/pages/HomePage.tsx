import { Link } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { availableGames } from '../data/games';
import { useAuth } from '../context/AuthContext';
import { releaseInfo, releaseStage } from '../config/release';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__copy">
            <h1>
              Учись мыслить <span>по шагам</span>
            </h1>
            <p>
              {releaseStage === 1
                ? 'Создавай личный профиль и готовься изучать алгоритмы на коротких понятных заданиях.'
                : 'Решай короткие игровые задачи и изучай алгоритмы в своём темпе.'}
            </p>
            <div className="hero__actions">
              <Link
                className="button button--primary button--large"
                to={isAuthenticated ? '/dashboard' : '/register'}
              >
                {isAuthenticated ? 'Продолжить обучение' : 'Начать бесплатно'}
              </Link>
              <Link className="button button--ghost button--large" to="/about">
                Как это работает?
              </Link>
            </div>
            <div className="hero__facts" aria-label="Преимущества">
              <span>Без оценок</span>
              <span>В своём темпе</span>
              <span>10-15 минут в день</span>
            </div>
          </div>
        </div>
      </section>

      {releaseStage >= 2 && <section className="page-section home-games">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="eyebrow">Играй и развивайся</span>
            <h2>{availableGames.length === 1 ? 'Первое задание уже доступно' : `Доступно игр: ${availableGames.length}`}</h2>
            <p>{releaseInfo[releaseStage as keyof typeof releaseInfo].description}</p>
          </div>
          <div className="game-grid">
            {availableGames.map((game) => (
              <GameCard key={game.code} game={game} compact />
            ))}
          </div>
        </div>
      </section>}

      <section className="page-section page-section--tint">
        <div className="container steps-grid">
          <div className="section-heading">
            <span className="eyebrow">Всё просто</span>
            <h2>Три шага до первого результата</h2>
          </div>
          <ol className="steps-list">
            <li>
              <span>1</span>
              <div>
                <h3>Создай профиль</h3>
                <p>Нужны только имя, почта и пароль.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Проходи уровни</h3>
                <p>Каждое задание объясняется простыми словами.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Собирай очки</h3>
                <p>{releaseStage >= 6 ? 'Следи за прогрессом и улучшай результаты.' : 'Новые возможности добавляются по этапам.'}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
