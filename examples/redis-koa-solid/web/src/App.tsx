import { createEffect, createSignal, Show, For } from "solid-js";
import "./App.css";
import { fetchCheckins, submitCheckin, type Checkin, type ActiveUser } from "./api";

function relativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function App() {
  const [checkins, setCheckins] = createSignal<Checkin[]>([]);
  const [users, setUsers] = createSignal<ActiveUser[]>([]);
  const [user, setUser] = createSignal("");
  const [message, setMessage] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCheckins();
      setCheckins(data.checkins);
      setUsers(data.users);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    load();
  });

  const submit = async (event: Event) => {
    event.preventDefault();
    if (!user().trim() || !message().trim()) return;
    try {
      const data = await submitCheckin({ user: user().trim(), message: message().trim() });
      setCheckins(data.checkins);
      setUsers(data.users);
      setMessage("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main>
      <section class="hero">
        <p class="eyebrow">DBForge Showcase · Redis + Koa + Solid</p>
        <h1>Pulse board backed by Redis Streams</h1>
        <p class="lead">
          Every check-in lands inside a Redis stream managed by DBForge Cloud. This dashboard polls the
          stream and highlights who’s actively shipping projects.
        </p>
      </section>

      <section class="panel form-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Log a check-in</p>
            <p class="muted">
              Entries are appended to <code>dbforge:checkins</code> and user activity lives in{" "}
              <code>dbforge:users</code>.
            </p>
          </div>
          <button class="ghost" onClick={load} disabled={loading()}>
            {loading() ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <form class="checkin-form" onSubmit={submit}>
          <label>
            <span>Name</span>
            <input
              type="text"
              value={user()}
              onInput={(event) => setUser(event.currentTarget.value)}
              placeholder="Nora"
              required
            />
          </label>
          <label class="full">
            <span>Update</span>
            <textarea
              rows={3}
              value={message()}
              onInput={(event) => setMessage(event.currentTarget.value)}
              placeholder="Pushing the Redis showcase to prod…"
              required
            />
          </label>
          <div class="actions">
            <button class="primary" type="submit">
              Save to stream
            </button>
          </div>
        </form>
        <Show when={error()}>
          {(msg) => <p class="error">{msg}</p>}
        </Show>
      </section>

      <section class="panel grid-panel">
        <div>
          <p class="eyebrow">Live feed</p>
          <Show when={!loading()} fallback={<p class="muted">Loading…</p>}>
            <ul class="checkins">
              <For each={checkins()}>
                {(entry) => (
                  <li>
                    <div>
                      <strong>{entry.user}</strong>
                      <p>{entry.message}</p>
                    </div>
                    <span>{relativeTime(entry.timestamp)}</span>
                  </li>
                )}
              </For>
              <Show when={checkins().length === 0}>
                <li class="empty">No check-ins yet. Share one above!</li>
              </Show>
            </ul>
          </Show>
        </div>
        <div>
          <p class="eyebrow">Active teammates</p>
          <ul class="users">
            <For each={users()}>
              {(member) => (
                <li>
                  <strong>{member.name}</strong>
                  <span>{relativeTime(member.lastSeen)}</span>
                </li>
              )}
            </For>
            <Show when={users().length === 0}>
              <li class="empty">No one has checked in yet.</li>
            </Show>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default App;
