import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="АлгоСтарт - главная">
      АлгоСтарт
    </Link>
  );
}
