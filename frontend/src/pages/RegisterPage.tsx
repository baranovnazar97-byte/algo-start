import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { availableGames } from '../data/games';
import { releaseStage } from '../config/release';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Пароли не совпадают. Проверь их ещё раз.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Не получилось создать профиль.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page page-section">
      <div className="container auth-page__inner">
        <div className="auth-aside auth-aside--register">
          <span className="eyebrow eyebrow--yellow">Новое приключение</span>
          <h1>Создай свой профиль игрока</h1>
          <p>Проходи уровни, собирай очки и наблюдай, как растёт твой результат.</p>
          <ul className="check-list">
            <li>Личный профиль игрока</li>
            {availableGames.length > 0 && <li>{availableGames.length} {availableGames.length === 1 ? 'мини-игра' : 'мини-игры'}</li>}
            {availableGames.length > 0 && <li>{availableGames.length * 3} коротких уровней</li>}
            {releaseStage >= 6 && <li>Подробный личный прогресс</li>}
          </ul>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div>
            <h2>Регистрация</h2>
            <p>Это займёт меньше минуты.</p>
          </div>
          {error && <div className="inline-alert inline-alert--error">{error}</div>}
          <label className="field">
            <span>Твоё имя</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Маша"
              autoComplete="name"
              minLength={2}
              maxLength={40}
              required
            />
          </label>
          <label className="field">
            <span>Электронная почта</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.ru"
              autoComplete="email"
              required
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="От 6 символов"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label className="field">
              <span>Повтори пароль</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ещё раз"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
          </div>
          <button className="button button--primary button--large button--full" disabled={loading}>
            {loading ? 'Создаём профиль...' : 'Начать играть'}
          </button>
          <p className="auth-card__switch">
            Уже есть профиль? <Link to="/login">Войти</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
