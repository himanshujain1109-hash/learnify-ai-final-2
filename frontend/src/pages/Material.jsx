import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMaterial } from '../services/materials';
import { generateLesson } from '../services/lessons';
import Loader from '../components/Loader';
import BackButton from '../components/BackButton';

export default function Material() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(null);

  const load = () =>
    getMaterial(id)
      .then(setData)
      .catch((e) => setError(e.response?.data?.message || 'Failed to load'));

  useEffect(() => {
    load();
  }, [id]);

  if (error) {
    return (
      <div style={{ marginTop: 20 }}>
        <BackButton to="/dashboard" label="Back to Dashboard" />
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!data) return <Loader />;

  const m = data.material;

  const create = async (topicId) => {
    setGenerating(topicId);
    setError('');
    try {
      await generateLesson(topicId);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not generate the lesson.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <>
      <BackButton to="/dashboard" label="Back to Dashboard" />
      <div className="dash-hero">
        <div>
          <span className="eyebrow">STUDY MATERIAL</span>
          <h1>{m.title}</h1>
          <p>
            {m.originalFileName} · {m.status || 'Ready'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            className="btn"
            style={{
              background: 'var(--glow-purple)',
              borderColor: 'var(--glow-cyan)'
            }}
            to={`/video/${m._id}`}
          >
            ✦ Create Masterclass Video
          </Link>
          <Link className="btn" to={`/tutor/${m._id}`}>
            ✦ Ask AI Tutor
          </Link>
        </div>
      </div>

      <div className="section-heading compact">
        <div>
          <span className="eyebrow">LEARNING MAP</span>
          <h2>Your topics</h2>
        </div>
        <span className="muted">{data.topics?.length || 0} topics</span>
      </div>

      {data.topics?.length ? (
        <div className="grid">
          {data.topics.map((t) => (
            <div className="card" key={t._id}>
              <span className="badge">
                Topic {t.order} · {t.difficulty || 'College'}
              </span>
              <h3 style={{ marginTop: 12 }}>{t.title}</h3>
              <p className="muted">{t.description}</p>
              {t.lessonId ? (
                <Link className="btn" to={`/lessons/${t.lessonId}`}>
                  Open lesson →
                </Link>
              ) : (
                <button
                  className="btn"
                  onClick={() => create(t._id)}
                  disabled={generating === t._id}
                >
                  {generating === t._id ? 'Creating lesson…' : 'Create AI lesson →'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No topics found</h3>
          <p>Try uploading a clearer or text-rich document.</p>
        </div>
      )}
    </>
  );
}
