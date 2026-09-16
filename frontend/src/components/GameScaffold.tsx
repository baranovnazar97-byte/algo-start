import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { gameByCode } from '../data/games';
import type { GameCode } from '../types';
import { LevelPicker } from './LevelPicker';

interface GameScaffoldProps extends PropsWithChildren {
  gameCode: GameCode;
  level: number;
  title: string;
  instruction: string;
  side?: ReactNode;
}

export function GameScaffold({
  gameCode,
  level,
  title,
  instruction,
  children,
  side,
}: GameScaffoldProps) {
  const game = gameByCode(gameCode)!;
  return (
    <section className="game-page page-section">
      <div className="container container--game">
        <div className="game-page__crumbs">
          <Link to="/games">Все игры</Link>
          <span>{game.title}</span>
        </div>
        <div className="game-page__heading">
          <div>
            <span className="eyebrow">Уровень {level} из 3</span>
            <h1>{title}</h1>
            <p>{instruction}</p>
          </div>
          <LevelPicker gameCode={gameCode} currentLevel={level} />
        </div>
        <div className={`game-board${side ? ' game-board--with-side' : ''}`}>
          <div className="game-board__main">{children}</div>
          {side && <aside className="game-board__side">{side}</aside>}
        </div>
      </div>
    </section>
  );
}
