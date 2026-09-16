import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <section className="page-section">
      <div className="container narrow-page">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">О тренажёре</span>
          <h1>Алгоритм - это просто план</h1>
          <p>
            Мы показываем ребёнку, что алгоритмы встречаются повсюду: когда он собирает
            рюкзак, ведёт робота по клеткам или выбирает одежду по погоде.
          </p>
        </div>
        <div className="about-grid">
          <article className="info-card">
            <h2>Что тренируем</h2>
            <p>Внимание, логику, умение делить большую задачу на понятные шаги.</p>
          </article>
          <article className="info-card">
            <h2>Как занимаемся</h2>
            <p>Короткие уровни без сложных правил. Ошибаться можно сколько угодно.</p>
          </article>
          <article className="info-card">
            <h2>Как растём</h2>
            <p>От последовательностей переходим к командам, поиску ошибок и условиям.</p>
          </article>
        </div>
        <div className="cta-card">
          <div>
            <span className="eyebrow eyebrow--yellow">Готов попробовать?</span>
            <h2>Первое задание займёт всего несколько минут</h2>
          </div>
          <Link className="button button--white button--large" to="/register">
            Создать профиль
          </Link>
        </div>
      </div>
    </section>
  );
}
