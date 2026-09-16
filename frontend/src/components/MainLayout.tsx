import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { releaseStage } from '../config/release';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `header__link${isActive ? ' header__link--active' : ''}`;

export function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <header className="header">
        <div className="container header__inner">
          <Logo />
          <button
            className="header__burger"
            type="button"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <nav
            className={`header__nav${menuOpen ? ' header__nav--open' : ''}`}
            aria-label="Основное меню"
            key={location.pathname}
          >
            {isAuthenticated ? (
              <>
                <NavLink className={navClass} to="/dashboard" onClick={closeMenu}>
                  Главная
                </NavLink>
                {releaseStage >= 2 && (
                  <NavLink className={navClass} to="/games" onClick={closeMenu}>
                    Игры
                  </NavLink>
                )}
                {releaseStage >= 6 && (
                  <>
                    <NavLink className={navClass} to="/progress" onClick={closeMenu}>
                      Прогресс
                    </NavLink>
                    <NavLink className="header__profile" to="/profile" onClick={closeMenu}>
                      <span className="avatar avatar--small" aria-hidden="true">
                        {user?.name.charAt(0).toUpperCase() || 'И'}
                      </span>
                      <span>{user?.name.split(' ')[0]}</span>
                    </NavLink>
                  </>
                )}
                <button
                  className="button button--ghost button--small header__logout"
                  type="button"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink className={navClass} to="/" end onClick={closeMenu}>
                  Главная
                </NavLink>
                <NavLink className={navClass} to="/about" onClick={closeMenu}>
                  Как это работает
                </NavLink>
                <Link className="button button--ghost button--small" to="/login" onClick={closeMenu}>
                  Войти
                </Link>
                <Link className="button button--primary button--small" to="/register" onClick={closeMenu}>
                  Начать бесплатно
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <Logo />
          <p>Учимся думать по шагам</p>
          <p className="footer__meta">Учебный проект, 2026</p>
        </div>
      </footer>
    </div>
  );
}
