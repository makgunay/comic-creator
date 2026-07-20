import type { Project } from "../../../domain/project";

const labels = {
  setup: "Setup",
  problem: "Problem",
  bigMoment: "Big Moment",
  ending: "Ending",
} as const;

const hints = {
  setup: "Who is the hero, and where are they?",
  problem: "What goes wrong?",
  bigMoment: "What is the most important action or choice?",
  ending: "How does it finish?",
} as const;

function BeatIcon({ type }: { type: keyof typeof labels }) {
  const paths = {
    setup: <><circle cx="12" cy="8" r="4" /><path d="M5 21c.7-5 3-7 7-7s6.3 2 7 7" /></>,
    problem: <><path d="M5 15a5 5 0 0 1 2-9 6 6 0 0 1 11 2 4 4 0 0 1 0 8H7" /><path d="m13 12-3 5h3l-2 5" /></>,
    bigMoment: <path d="m12 2 2.3 6 6.2-1.7-3.4 5.4 5 4-6.4.5.4 6.4-4.1-5-4.1 5 .4-6.4-6.4-.5 5-4-3.4-5.4L9.7 8 12 2Z" />,
    ending: <><path d="m12 3 6 6-6 6-6-6 6-6Z" /><path d="M9 17c0 3-2 4-5 4M15 17c0 3 2 4 5 4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

export function StorySpine({
  project,
  onChange,
}: {
  project: Project;
  onChange: (project: Project) => void;
}) {
  return (
    <section className="screen-section story-screen" aria-labelledby="story-title">
      <header className="screen-heading">
        <h1 id="story-title">Build your story</h1>
        <p>You write the four moments. Your illustrator follows your lead.</p>
      </header>
      <div className="story-line" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="beat-grid">
        {project.beats.map((beat) => (
          <label key={beat.id} className={`beat-card beat-${beat.type}`}>
            <span className="beat-header">
              <span className="beat-icon"><BeatIcon type={beat.type} /></span>
              <span>
                <strong>{labels[beat.type]}</strong>
                <span>{hints[beat.type]}</span>
              </span>
            </span>
            <textarea
              aria-label={labels[beat.type]}
              value={beat.childText}
              onChange={(event) => onChange({
                ...project,
                beats: project.beats.map((item) => item.id === beat.id
                  ? { ...item, childText: event.target.value }
                  : item),
              })}
              maxLength={800}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
