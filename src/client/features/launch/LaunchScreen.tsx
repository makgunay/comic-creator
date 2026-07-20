import { useState, type FormEvent } from "react";
import type { Project } from "../../../domain/project";
import { ComicApiError, type ComicApi } from "../../api/client";
import { StatusNotice } from "../../components/StatusNotice";

const sampleArtwork = new URL(
  "../../../../sample-assets/moon-kite/images/panel-1.png",
  import.meta.url,
).href;

export function LaunchScreen({
  api,
  onOpenProject,
  generationEnabled = true,
}: {
  api: ComicApi;
  onOpenProject: (project: Project) => void;
  generationEnabled?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState<"create" | "sample">();
  const [error, setError] = useState<string>();

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy("create");
    setError(undefined);
    try {
      onOpenProject(await api.createProject({
        title: title.trim(),
        localAuthorCredit: author.trim(),
      }));
    } catch (caught) {
      setError(caught instanceof ComicApiError ? caught.message : "The comic could not be started.");
    } finally {
      setBusy(undefined);
    }
  };

  const openSample = async () => {
    setBusy("sample");
    setError(undefined);
    try {
      onOpenProject(await api.copySample());
    } catch (caught) {
      setError(caught instanceof ComicApiError ? caught.message : "The sample could not be opened.");
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <main className="launch-shell">
      <header className="launch-header">
        <span className="brand-name">Comic Creator</span>
        <p>Write the story. Direct the art. Make a comic that is yours.</p>
      </header>
      {!generationEnabled ? (
        <StatusNotice title="Sample mode">
          You can write and explore locally. Drawing controls stay off.
        </StatusNotice>
      ) : null}
      {error ? <StatusNotice title="Try again" tone="error">{error}</StatusNotice> : null}
      <div className="launch-layout">
        <section className="launch-copy" aria-labelledby="launch-title">
          <h1 id="launch-title">Your story deserves a comic.</h1>
          <p className="launch-intro">
            Invent a hero, shape four big moments, and guide every picture.
            The words stay yours from first idea to final page.
          </p>
          <form className="launch-form" onSubmit={create}>
            <label htmlFor="comic-title">Comic title</label>
            <input
              id="comic-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The Clockwork Cloud"
              required
              maxLength={100}
            />
            <label htmlFor="author-credit">Author credit (optional)</label>
            <input
              id="author-credit"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="A nickname or first name"
              maxLength={60}
            />
            <button className="button button-primary" type="submit" disabled={busy !== undefined || !title.trim()}>
              {busy === "create" ? "Starting…" : "Start a new comic"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={busy !== undefined}
              onClick={openSample}
            >
              {busy === "sample" ? "Opening…" : "Explore the sample"}
            </button>
          </form>
        </section>
        <figure className="launch-art">
          <img src={sampleArtwork} alt="Nova flying a moon kite above glowing rooftops" />
          <figcaption>
            <strong>Nova and the Moon Kite</strong>
            <span>A finished local sample you can explore and edit.</span>
          </figcaption>
        </figure>
      </div>
    </main>
  );
}
