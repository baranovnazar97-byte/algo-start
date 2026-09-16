import { useState } from 'react';
import { GameResult } from '../components/GameResult';
import { GameScaffold } from '../components/GameScaffold';
import { useLevelCompletion } from '../hooks/useLevelCompletion';

interface SequenceStep {
  id: string;
  text: string;
}

interface SequenceLevel {
  title: string;
  instruction: string;
  task: string;
  correct: SequenceStep[];
  start: SequenceStep[];
}

const levels: Record<number, SequenceLevel> = {
  1: {
    title: 'Доброе утро',
    instruction: 'Поставь утренние дела в правильном порядке.',
    task: 'Что нужно сделать перед школой?',
    correct: [
      { id: 'wake', text: 'Проснуться' },
      { id: 'wash', text: 'Умыться и почистить зубы' },
      { id: 'dress', text: 'Одеться' },
      { id: 'eat', text: 'Позавтракать' },
      { id: 'bag', text: 'Взять рюкзак и выйти' },
    ],
    start: [
      { id: 'dress', text: 'Одеться' },
      { id: 'wake', text: 'Проснуться' },
      { id: 'bag', text: 'Взять рюкзак и выйти' },
      { id: 'wash', text: 'Умыться и почистить зубы' },
      { id: 'eat', text: 'Позавтракать' },
    ],
  },
  2: {
    title: 'Вкусный бутерброд',
    instruction: 'Составь алгоритм приготовления бутерброда.',
    task: 'Начни с подготовки продуктов и закончи подачей.',
    correct: [
      { id: 'wash', text: 'Помыть руки' },
      { id: 'bread', text: 'Положить ломтик хлеба' },
      { id: 'cheese', text: 'Добавить сыр' },
      { id: 'tomato', text: 'Добавить помидор' },
      { id: 'serve', text: 'Положить на тарелку' },
    ],
    start: [
      { id: 'cheese', text: 'Добавить сыр' },
      { id: 'serve', text: 'Положить на тарелку' },
      { id: 'wash', text: 'Помыть руки' },
      { id: 'tomato', text: 'Добавить помидор' },
      { id: 'bread', text: 'Положить ломтик хлеба' },
    ],
  },
  3: {
    title: 'Посади цветок',
    instruction: 'Расставь шаги так, чтобы семечко смогло вырасти.',
    task: 'Как правильно посадить семечко?',
    correct: [
      { id: 'soil', text: 'Насыпать землю в горшок' },
      { id: 'hole', text: 'Сделать маленькую ямку' },
      { id: 'seed', text: 'Положить семечко' },
      { id: 'cover', text: 'Присыпать землёй' },
      { id: 'water', text: 'Полить водой' },
      { id: 'sun', text: 'Поставить на свет' },
    ],
    start: [
      { id: 'water', text: 'Полить водой' },
      { id: 'seed', text: 'Положить семечко' },
      { id: 'soil', text: 'Насыпать землю в горшок' },
      { id: 'sun', text: 'Поставить на свет' },
      { id: 'hole', text: 'Сделать маленькую ямку' },
      { id: 'cover', text: 'Присыпать землёй' },
    ],
  },
};

export function SequenceGame({ level }: { level: number }) {
  const config = levels[level];
  const [steps, setSteps] = useState(config.start);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const completion = useLevelCompletion('sequence', level);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setFeedback('');
  };

  const check = () => {
    const correct = steps.every((step, index) => step.id === config.correct[index].id);
    if (correct) {
      void completion.save(Math.max(55, 100 - mistakes * 15));
    } else {
      setMistakes((value) => value + 1);
      const firstWrong = steps.findIndex((step, index) => step.id !== config.correct[index].id);
      setFeedback(`Проверь шаг ${firstWrong + 1}. Что должно произойти раньше?`);
    }
  };

  if (completion.status !== 'idle') {
    return (
      <GameScaffold
        gameCode="sequence"
        level={level}
        title={config.title}
        instruction={config.instruction}
      >
        <GameResult
          gameCode="sequence"
          level={level}
          score={completion.score}
          status={completion.status}
          onRetrySave={() => void completion.save(completion.score)}
        />
      </GameScaffold>
    );
  }

  return (
    <GameScaffold
      gameCode="sequence"
      level={level}
      title={config.title}
      instruction={config.instruction}
      side={
        <div className="helper-card">
          <h3>Подсказка</h3>
          <p>Нажимай кнопки справа, чтобы менять шаги местами.</p>
        </div>
      }
    >
      <div className="task-caption">{config.task}</div>
      <ol className="sequence-list">
        {steps.map((step, index) => (
          <li key={step.id}>
            <span className="sequence-list__number">{index + 1}</span>
            <strong>{step.text}</strong>
            <span className="sequence-list__controls">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Поднять шаг «${step.text}»`}>
                Поднять
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`Опустить шаг «${step.text}»`}>
                Опустить
              </button>
            </span>
          </li>
        ))}
      </ol>
      {feedback && <div className="game-feedback game-feedback--try">{feedback}</div>}
      <div className="game-actions">
        <button className="button button--ghost" type="button" onClick={() => { setSteps(config.start); setFeedback(''); }}>
          Начать заново
        </button>
        <button className="button button--primary" type="button" onClick={check}>
          Проверить порядок
        </button>
      </div>
    </GameScaffold>
  );
}
