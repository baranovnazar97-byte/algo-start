import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не получилось войти.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page page-section">
      <div className="container auth-page__inner">
        <div className="auth-aside">
          <span className="eyebrow eyebrow--yellow">С возвращением!</span>
          <h1>Продолжим приключение?</h1>
          <p>Твои очки и открытые уровни уже ждут тебя.</p>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div>
            <h2>Вход</h2>
            <p>Введи данные своего профиля.</p>
          </div>
          {error && <div className="inline-alert inline-alert--error">{error}</div>}
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
          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 6 символов"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          <button className="button button--primary button--large button--full" disabled={loading}>
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <p className="auth-card__switch">
            Ещё нет профиля? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
