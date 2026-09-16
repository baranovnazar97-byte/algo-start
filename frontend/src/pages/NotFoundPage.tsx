import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page-section not-found">
      <div className="container">
        <span className="not-found__number">404</span>
        <h1>Кажется, мы сбились с маршрута</h1>
        <p>Такой страницы нет, но вернуться к заданиям очень просто.</p>
        <Link className="button button--primary button--large" to="/">
          На главную
        </Link>
      </div>
    </section>
  );
}
