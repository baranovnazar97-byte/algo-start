import { useState } from 'react';
import { GameResult } from '../components/GameResult';
import { GameScaffold } from '../components/GameScaffold';
import { useLevelCompletion } from '../hooks/useLevelCompletion';

interface DebugLevel {
  title: string;
  instruction: string;
  story: string;
  steps: string[];
  wrongIndex: number;
  explanation: string;
}

const levels: Record<number, DebugLevel> = {
  1: {
    title: 'Чай с сюрпризом',
    instruction: 'В алгоритме есть один шаг не на своём месте. Найди его.',
    story: 'Алгоритм приготовления чая',
    steps: [
      'Взять чистую кружку',
      'Положить чайный пакетик',
      'Выпить чай',
      'Налить горячую воду',
      'Подождать несколько минут',
    ],
    wrongIndex: 2,
    explanation: 'Нельзя выпить чай до того, как мы налили воду и подождали.',
  },
  2: {
    title: 'Забывчивый художник',
    instruction: 'Один шаг мешает закончить рисунок. Выбери ошибку.',
    story: 'Алгоритм рисования домика',
    steps: [
      'Взять бумагу и карандаш',
      'Нарисовать квадрат - стены',
      'Убрать рисунок в папку',
      'Нарисовать треугольную крышу',
      'Добавить окна и дверь',
      'Раскрасить домик',
    ],
    wrongIndex: 2,
    explanation: 'Убирать рисунок в папку надо после того, как он полностью готов.',
  },
  3: {
    title: 'Ошибка в коде робота',
    instruction: 'Робот должен взять кубик и положить его в коробку. Что он делает не вовремя?',
    story: 'Программа робота-сортировщика',
    steps: [
      'Подойти к синему кубику',
      'Открыть захват',
      'Закрыть захват',
      'Вернуться к зарядке',
      'Подойти к синей коробке',
      'Открыть захват и положить кубик',
    ],
    wrongIndex: 3,
    explanation: 'Робот не должен возвращаться к зарядке, пока не отнёс кубик в коробку.',
  },
};

export function DebuggerGame({ level }: { level: number }) {
  const config = levels[level];
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [solved, setSolved] = useState(false);
  const completion = useLevelCompletion('debugger', level);

  const check = () => {
    if (selected === null) {
      setFeedback('Сначала выбери шаг, который кажется ошибочным.');
      return;
    }
    if (selected === config.wrongIndex) {
      if (solved) return;
      setSolved(true);
      setFeedback(config.explanation);
      window.setTimeout(() => void completion.save(Math.max(55, 100 - mistakes * 20)), 650);
    } else {
      setMistakes((value) => value + 1);
      setFeedback('Этот шаг полезный. Подумай, какой шаг случился слишком рано или уводит от цели.');
    }
  };

  if (completion.status !== 'idle') {
    return (
      <GameScaffold gameCode="debugger" level={level} title={config.title} instruction={config.instruction}>
        <GameResult gameCode="debugger" level={level} score={completion.score} status={completion.status} onRetrySave={() => void completion.save(completion.score)} />
      </GameScaffold>
    );
  }

  return (
    <GameScaffold
      gameCode="debugger"
      level={level}
      title={config.title}
      instruction={config.instruction}
      side={
        <div className="helper-card">
          <h3>Будь детективом</h3>
          <p>Хороший алгоритм ведёт к цели. Ошибочный шаг мешает или случается слишком рано.</p>
        </div>
      }
    >
      <div className="task-caption">{config.story}</div>
      <div className="debug-list" role="radiogroup" aria-label="Шаги алгоритма">
        {config.steps.map((step, index) => (
          <button
            type="button"
            role="radio"
            aria-checked={selected === index}
            disabled={solved}
            className={selected === index ? 'debug-step debug-step--selected' : 'debug-step'}
            key={step}
            onClick={() => { setSelected(index); setFeedback(''); }}
          >
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </button>
        ))}
      </div>
      {feedback && (
        <div className={`game-feedback${selected === config.wrongIndex ? ' game-feedback--success' : ' game-feedback--try'}`}>
          {feedback}
        </div>
      )}
      <div className="game-actions game-actions--right">
        <button className="button button--primary" type="button" onClick={check} disabled={solved}>
          {solved ? 'Ответ найден!' : 'Проверить ответ'}
        </button>
      </div>
    </GameScaffold>
  );
}
