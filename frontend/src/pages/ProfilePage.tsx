import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { totalScore, completedCount } = useProgress();
  const navigate = useNavigate();

  return (
    <section className="page-section">
      <div className="container profile-page">
        <div className="profile-card">
          <span className="avatar avatar--large" aria-hidden="true">
            {user?.name.charAt(0).toUpperCase()}
          </span>
          <div className="profile-card__heading">
            <span className="eyebrow">Профиль игрока</span>
            <h1>{user?.name}</h1>
            <p>{user?.email}</p>
          </div>
          <dl className="profile-stats">
            <div><dt>Очки</dt><dd>{totalScore}</dd></div>
            <div><dt>Уровни</dt><dd>{completedCount}/12</dd></div>
            <div><dt>Звание</dt><dd>{completedCount >= 9 ? 'Мастер' : completedCount >= 4 ? 'Исследователь' : 'Новичок'}</dd></div>
          </dl>
          {user?.createdAt && (
            <p className="profile-card__date">
              В игре с {new Intl.DateTimeFormat('ru-RU').format(new Date(user.createdAt))}
            </p>
          )}
          <button
            className="button button--danger"
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Выйти из профиля
          </button>
        </div>
      </div>
    </section>
  );
}
