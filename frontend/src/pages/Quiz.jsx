import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuiz, submitQuiz } from '../services/quiz';
import Loader from '../components/Loader';
import BackButton from '../components/BackButton';

export default function Quiz() {
  const { lessonId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuiz(lessonId)
      .then(setQuiz)
      .catch((e) => setError(e.response?.data?.message || 'Quiz unavailable'));
  }, [lessonId]);

  if (error) {
    return (
      <div style={{ marginTop: 20 }}>
        <BackButton label="Back" />
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!quiz) return <Loader text="Building your quiz…" />;

  const questions = quiz.questions || [];

  const submit = async () => {
    try {
      setResult(await submitQuiz(quiz._id, answers));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not submit');
    }
  };

  return (
    <>
      <BackButton label="Back to Lesson" />
      <div className="section-heading">
        <span className="eyebrow">QUICK PRACTICE</span>
        <h1>Test your understanding.</h1>
        <p className="muted">Choose the best answer for each question.</p>
      </div>
      {questions.map((q, i) => (
        <div className="card" key={q.id || i} style={{ marginBottom: 14 }}>
          <h3>
            {i + 1}. {q.question}
          </h3>
          {q.options.map((o, j) => (
            <label
              key={j}
              style={{
                display: 'block',
                margin: '12px 0',
                padding: '11px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name={`q${i}`}
                checked={answers[i] === j}
                onChange={() => setAnswers({ ...answers, [i]: j })}
              />{' '}
              <span style={{ marginLeft: 8 }}>{o}</span>
            </label>
          ))}
        </div>
      ))}
      <button className="btn btn-large" onClick={submit}>
        Submit quiz →
      </button>
      {result && (
        <div className="success" style={{ marginTop: 16 }}>
          Score: <b>{result.score}/{result.total}</b> —{' '}
          {result.score >= Math.ceil(result.total * 0.6)
            ? 'Great work!'
            : 'Review the lesson and try again.'}
        </div>
      )}
    </>
  );
}
