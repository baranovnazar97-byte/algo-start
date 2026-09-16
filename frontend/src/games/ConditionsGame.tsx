import { useState } from 'react';
import { GameResult } from '../components/GameResult';
import { GameScaffold } from '../components/GameScaffold';
import { useLevelCompletion } from '../hooks/useLevelCompletion';

interface Question {
  condition: string;
  options: string[];
  answer: number;
}

interface ConditionLevel {
  title: string;
  instruction: string;
  questions: Question[];
}

const levels: Record<number, ConditionLevel> = {
  1: {
    title: 'Собираемся гулять',
    instruction: 'Прочитай условие и выбери подходящее действие.',
    questions: [
      { condition: 'ЕСЛИ на улице идёт дождь, ТО...', options: ['взять зонт', 'надеть панаму', 'взять мяч'], answer: 0 },
      { condition: 'ЕСЛИ на улице мороз, ТО...', options: ['взять купальник', 'надеть тёплую куртку', 'открыть окно'], answer: 1 },
      { condition: 'ЕСЛИ ярко светит солнце, ТО...', options: ['взять санки', 'надеть валенки', 'надеть панаму'], answer: 2 },
    ],
  },
  2: {
    title: 'Заботливый помощник',
    instruction: 'Помоги домашнему роботу принять верное решение.',
    questions: [
      { condition: 'ЕСЛИ земля у цветка сухая, ТО...', options: ['полить цветок', 'выключить свет', 'спрятать горшок'], answer: 0 },
      { condition: 'ЕСЛИ миска кота пустая, ТО...', options: ['открыть зонт', 'положить корм', 'полить пол'], answer: 1 },
      { condition: 'ЕСЛИ в комнате никого нет, ТО...', options: ['открыть холодильник', 'включить музыку', 'выключить свет'], answer: 2 },
      { condition: 'ЕСЛИ игрушки лежат на полу, ТО...', options: ['убрать их в коробку', 'выключить воду', 'надеть шапку'], answer: 0 },
    ],
  },
  3: {
    title: 'Космическая станция',
    instruction: 'Выбирай команды для станции по показаниям датчиков.',
    questions: [
      { condition: 'ЕСЛИ заряд меньше 20%, ТО...', options: ['включить экономный режим', 'включить все лампы', 'отсоединить батарею'], answer: 0 },
      { condition: 'ЕСЛИ температура слишком высокая, ТО...', options: ['включить обогрев', 'включить охлаждение', 'ничего не делать'], answer: 1 },
      { condition: 'ЕСЛИ рядом метеорит, ТО...', options: ['открыть шлюз', 'выключить связь', 'включить защитный щит'], answer: 2 },
      { condition: 'ЕСЛИ пришёл сигнал с Земли, ТО...', options: ['принять сообщение', 'выбросить антенну', 'выключить компьютер'], answer: 0 },
      { condition: 'ЕСЛИ кислорода мало, ТО...', options: ['повысить температуру', 'включить запас кислорода', 'открыть дверь в космос'], answer: 1 },
    ],
  },
};

export function ConditionsGame({ level }: { level: number }) {
  const config = levels[level];
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState('');
  const completion = useLevelCompletion('conditions', level);
  const question = config.questions[questionIndex];

  const answer = (optionIndex: number) => {
    setSelected(optionIndex);
    if (optionIndex === question.answer) {
      setFeedback('Верно! Условие выполнено.');
    } else {
      setMistakes((value) => value + 1);
      setFeedback('Не совсем. Перечитай условие и попробуй другой вариант.');
    }
  };

  const next = () => {
    if (questionIndex === config.questions.length - 1) {
      void completion.save(Math.max(55, 100 - mistakes * 10));
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelected(null);
    setFeedback('');
  };

  if (completion.status !== 'idle') {
    return (
      <GameScaffold gameCode="conditions" level={level} title={config.title} instruction={config.instruction}>
        <GameResult gameCode="conditions" level={level} score={completion.score} status={completion.status} onRetrySave={() => void completion.save(completion.score)} />
      </GameScaffold>
    );
  }

  const isCorrect = selected === question.answer;
  return (
    <GameScaffold
      gameCode="conditions"
      level={level}
      title={config.title}
      instruction={config.instruction}
      side={
        <div className="helper-card">
          <h3>Запомни</h3>
          <p><strong>Условие</strong> помогает алгоритму выбрать действие в разных ситуациях.</p>
        </div>
      }
    >
      <div className="question-progress">
        <span>Вопрос {questionIndex + 1} из {config.questions.length}</span>
        <div>{config.questions.map((_, index) => <i className={index <= questionIndex ? 'active' : ''} key={index} />)}</div>
      </div>
      <div className="condition-card" key={questionIndex}>
        <h2>{question.condition}</h2>
        <div className="condition-options">
          {question.options.map((option, index) => (
            <button
              type="button"
              key={option}
              disabled={isCorrect}
              className={`${selected === index ? 'selected ' : ''}${isCorrect && index === question.answer ? 'correct' : ''}`}
              onClick={() => answer(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          ))}
        </div>
      </div>
      {feedback && <div className={`game-feedback${isCorrect ? ' game-feedback--success' : ' game-feedback--try'}`}>{feedback}</div>}
      <div className="game-actions game-actions--right">
        {isCorrect && (
          <button className="button button--primary" type="button" onClick={next}>
            {questionIndex === config.questions.length - 1 ? 'Завершить уровень' : 'Следующий вопрос'}
          </button>
        )}
      </div>
    </GameScaffold>
  );
}
