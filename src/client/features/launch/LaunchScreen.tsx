import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import {
  LOCAL_AUTHOR_CREDIT_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
  type Project,
} from "../../../domain/project";
import {
  ComicApiError,
  type ComicApi,
  type GenerationConfigStatus,
} from "../../api/client";
import { StatusNotice } from "../../components/StatusNotice";

const sampleArtwork = new URL(
  "../../../../sample-assets/moon-kite/images/sample-art-1.png",
  import.meta.url,
).href;

export function LaunchScreen({
  api,
  onOpenProject,
  configStatus = "enabled",
}: {
  api: ComicApi;
  onOpenProject: (project: Project) => void;
  configStatus?: GenerationConfigStatus;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [busy, setBusy] = useState<"create" | "sample">();
  const [error, setError] = useState<string>();
  const mounted = useRef(true);
  const requestId = useRef(0);
  const onOpenProjectRef = useRef(onOpenProject);

  useLayoutEffect(() => {
    onOpenProjectRef.current = onOpenProject;
  }, [onOpenProject]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    requestId.current += 1;
    setBusy(undefined);
    setError(undefined);
  }, [api]);

  const runRequest = async (
    kind: "create" | "sample",
    request: () => Promise<Project>,
    fallback: string,
  ) => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setBusy(kind);
    setError(undefined);
    try {
      const project = await request();
      if (!mounted.current || requestId.current !== activeRequest) return;
      setBusy(undefined);
      onOpenProjectRef.current(project);
    } catch (caught) {
      if (!mounted.current || requestId.current !== activeRequest) return;
      setBusy(undefined);
      setError(caught instanceof ComicApiError ? caught.message : fallback);
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await runRequest(
      "create",
      () => api.createProject({
        title: title.trim(),
        localAuthorCredit: author.trim(),
      }),
      "The comic could not be started.",
    );
  };

  const openSample = async () => {
    await runRequest("sample", () => api.copySample(), "The sample could not be opened.");
  };

  return (
    <main className="launch-shell">
      <header className="launch-header">
        <span className="brand-name">Comic Creator</span>
        <p>Write the story. Direct the art. Make a comic that is yours.</p>
      </header>
      {configStatus === "loading" ? (
        <StatusNotice title="Checking the art studio">
          You can start writing while drawing availability is checked.
        </StatusNotice>
      ) : null}
      {configStatus === "disabled" ? (
        <StatusNotice title="Sample mode">
          You can write and explore locally. Drawing controls stay off.
        </StatusNotice>
      ) : null}
      {configStatus === "error" ? (
        <StatusNotice title="Local mode" tone="error">
          Configuration could not be checked, so drawing stays off for now.
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
              maxLength={PROJECT_TITLE_MAX_LENGTH}
            />
            <label htmlFor="author-credit">Author credit (optional)</label>
            <input
              id="author-credit"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="A nickname or first name"
              maxLength={LOCAL_AUTHOR_CREDIT_MAX_LENGTH}
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
