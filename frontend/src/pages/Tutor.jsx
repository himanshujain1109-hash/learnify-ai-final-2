import { useState } from "react";
import { useParams } from "react-router-dom";
import { askTutor } from "../services/tutor";
import VisualRenderer from "../components/VisualRenderer";
import BackButton from "../components/BackButton";

function List({ items, className = "" }) {
  if (!items?.length) return null;
  return <ul className={className}>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
}

function QuizCard({ quiz }) {
  const [revealed, setRevealed] = useState(false);
  if (!quiz?.question) return null;
  return (
    <div className="quick-check card-3d" style={{ background: "linear-gradient(to right bottom, #1a1e3a, #111528)", border: "1px solid #373e69", borderRadius: 12, padding: 20, marginTop: 20 }}>
      <span className="visual-label" style={{ color: "#34d399", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>QUICK CHECKPOINT</span>
      <h4>{quiz.question}</h4>
      <div className="quiz-options">
        {(quiz.options || []).map((option, index) => (
          <button
            type="button"
            className={revealed && index === quiz.answerIndex ? "quiz-option correct" : "quiz-option"}
            onClick={() => setRevealed(true)}
            key={`${option}-${index}`}
          >
            <b>{String.fromCharCode(65 + index)}</b>{option}
          </button>
        ))}
      </div>
      {revealed && <div className="quiz-answer"><b>Answer:</b> {quiz.options?.[quiz.answerIndex] || "See the explanation above."}<br />{quiz.explanation}</div>}
    </div>
  );
}

function StructuredLesson({ lesson, onFollowUp }) {
  return (
    <article className="structured-lesson">
      <div className="lesson-hero card-3d" style={{ background: "linear-gradient(135deg, #1c2145, #111428)", border: "1px solid #6d5dfc", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <span className="eyebrow">YOUR PERSONAL LESSON</span>
        <h2>{lesson.title}</h2>
        <p>{lesson.overview}</p>
      </div>

      {lesson.learningObjectives?.length > 0 && (
        <section className="lesson-objectives card-3d" style={{ background: "#111528", border: "1px solid #373e69", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <span className="visual-label" style={{ color: "#00e1ff", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>BY THE END, YOU WILL BE ABLE TO</span>
          <List items={lesson.learningObjectives} />
        </section>
      )}

      <div className="lesson-sections">
        {(lesson.sections || []).map((section, index) => (
          <section className="teaching-section card-3d" key={`${section.title}-${index}`} style={{ display: "block", background: "#161a35", border: "1px solid #2d3359", borderRadius: 16, padding: 24, marginBottom: 24, position: "relative" }}>
            <div className="section-number" style={{ position: "absolute", top: -15, left: -15, background: "#6d5dfc", color: "#fff", width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", boxShadow: "0 4px 15px rgba(109, 93, 252, 0.4)" }}>{String(index + 1).padStart(2, "0")}</div>
            <div className="section-content">
              <span className="badge">{section.type || "concept"}</span>
              <h3>{section.title}</h3>
              {section.whatItIs && <div className="teaching-block" style={{ marginBottom: 16 }}><strong>What is it?</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.whatItIs}</p></div>}
              {section.whyItMatters && <div className="teaching-block" style={{ marginBottom: 16 }}><strong>Why does it matter?</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.whyItMatters}</p></div>}
              {section.simpleExplanation && <div className="simple-callout" style={{ background: "rgba(0, 225, 255, 0.05)", borderLeft: "4px solid #00e1ff", padding: 12, borderRadius: 6, marginBottom: 16 }}><strong>In simple words</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.simpleExplanation}</p></div>}
              {section.explanation && section.explanation !== section.simpleExplanation && <div className="teaching-block" style={{ marginBottom: 16 }}><strong>Teacher explanation</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.explanation}</p></div>}
              {section.analogy && <div className="analogy-callout" style={{ background: "rgba(109, 93, 252, 0.05)", borderLeft: "4px solid #6d5dfc", padding: 12, borderRadius: 6, marginBottom: 16 }}><strong>Think of it like this</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.analogy}</p></div>}
              {section.example && <div className="example-callout" style={{ background: "rgba(52, 211, 153, 0.05)", borderLeft: "4px solid #34d399", padding: 12, borderRadius: 6, marginBottom: 16 }}><strong>Worked example</strong><p style={{ marginTop: 4, color: "#e1def1" }}>{section.example}</p></div>}
              {section.stepByStep?.length > 0 && <div className="step-block"><strong>Step by step</strong><List items={section.stepByStep} /></div>}
              <VisualRenderer visual={section.visual} />
              {section.code?.content && (
                <div className="code-block">
                  <div className="visual-label">{section.code.language || "CODE"}</div>
                  <pre>{section.code.content}</pre>
                </div>
              )}
              {section.formulas?.length > 0 && <div className="formula-block"><strong>Formula / complexity</strong><List items={section.formulas} /></div>}
              {section.keyPoints?.length > 0 && <div className="teaching-block"><strong>Key points</strong><List items={section.keyPoints} /></div>}
              <div className="lesson-columns">
                {section.commonMistakes?.length > 0 && <div className="warning-block"><strong>Common mistakes</strong><List items={section.commonMistakes} /></div>}
                {section.examTips?.length > 0 && <div className="exam-block"><strong>Exam tip</strong><List items={section.examTips} /></div>}
              </div>
              {section.quiz?.map((quiz, quizIndex) => <QuizCard quiz={quiz} key={quizIndex} />)}
              <div className="lesson-actions" style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                <button type="button" className="btn secondary card-3d" onClick={() => onFollowUp(`Explain "${section.title}" even more simply with a new example.`)}>✨ Explain simpler</button>
                <button type="button" className="btn secondary card-3d" onClick={() => onFollowUp(`Why is "${section.title}" important, and where is it used?`)}>🌍 Why does it matter?</button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {lesson.studyPlan?.length > 0 && <section className="study-plan"><span className="visual-label">YOUR NEXT STUDY STEPS</span><List items={lesson.studyPlan} /></section>}
      {lesson.sources?.length > 0 && (
        <div className="source-strip">
          <strong>Based on your material</strong>
          <span>{lesson.sources.map((source) => `Section ${source.id}: ${source.title}`).join(" · ")}</span>
        </div>
      )}
    </article>
  );
}

export default function Tutor() {
  const { documentId } = useParams();
  const [question, setQuestion] = useState("");
  const [lesson, setLesson] = useState(null);
  const [legacyAnswer, setLegacyAnswer] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const submitQuestion = async (nextQuestion) => {
    const value = String(nextQuestion || question).trim();
    if (!value) return;
    setQuestion(value);
    setLoading(true);
    setWarning("");
    setLegacyAnswer("");
    try {
      const data = await askTutor(documentId, value);
      const structured = data.lesson || (data.answer && typeof data.answer === "object" ? data.answer : null);
      if (structured) setLesson(structured);
      else setLegacyAnswer(String(data.answer || ""));
      if (data.warning) setWarning(data.warning);
    } catch (error) {
      setWarning(error.response?.data?.message || "AI Tutor encountered a temporary delay. Please click 'Teach me' again.");
    } finally {
      setLoading(false);
    }
  };

  const backTarget = documentId ? `/materials/${documentId}` : "/dashboard";

  return (
    <div className="tutor-page">
      <BackButton to={backTarget} label="Back to Study Material" />
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">YOUR MATERIAL, YOUR TEACHER</span>
          <h2>AI Tutor</h2>
          <p>Ask for a full lesson, a simpler explanation, examples, exam preparation or a visual breakdown.</p>
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); submitQuestion(); }} className="content-card tutor-form card-3d" style={{ background: "linear-gradient(to right bottom, #1c2145, #161a35)", border: "1px solid #373e69" }}>
        <div className="field">
          <label>What would you like to learn?</label>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Teach me this PDF section by section with examples and diagrams..." />
        </div>
        <div className="prompt-suggestions">
          {["Teach me the whole PDF in simple language", "Explain the most important concept with a diagram", "Prepare me for an exam from this material"].map((prompt) => (
            <button type="button" className="prompt-chip" onClick={() => setQuestion(prompt)} key={prompt}>{prompt}</button>
          ))}
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? "Building your lesson..." : "Teach me →"}</button>
      </form>
      {warning && <div className="error tutor-warning">{warning}</div>}
      {loading && <div className="content-card tutor-loading"><div className="loader-dots"><span /> <span /> <span /></div><p>Reading the relevant material and preparing explanations, examples and visuals…</p></div>}
      {lesson && !loading && <StructuredLesson lesson={lesson} onFollowUp={submitQuestion} />}
      {legacyAnswer && !loading && <div className="content-card tutor-answer"><span className="eyebrow">AI TUTOR</span><h2>Teacher-style explanation</h2><div className="lesson">{legacyAnswer}</div></div>}
    </div>
  );
}