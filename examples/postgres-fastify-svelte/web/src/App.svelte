<script lang="ts">
  import { onMount } from 'svelte';
  import {
    clearCompleted,
    createTask,
    fetchTasks,
    toggleTask,
    type Task
  } from './lib/api';

  let tasks: Task[] = [];
  let newTitle = '';
  let loading = true;
  let status: { type: 'error' | 'info'; message: string } | null = null;

  const loadTasks = async () => {
    loading = true;
    status = null;
    try {
      const { tasks: data } = await fetchTasks();
      tasks = data;
    } catch (error) {
      status = { type: 'error', message: (error as Error).message };
    } finally {
      loading = false;
    }
  };

  onMount(loadTasks);

  const handleCreate = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { task } = await createTask(newTitle.trim());
      if (task) {
        tasks = [task, ...tasks];
      }
      newTitle = '';
    } catch (error) {
      status = { type: 'error', message: (error as Error).message };
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      const { task: updated } = await toggleTask(task.id, !task.completed);
      if (updated) {
        tasks = tasks.map((t) => (t.id === task.id ? updated : t));
      }
    } catch (error) {
      status = { type: 'error', message: (error as Error).message };
    }
  };

  const handleClear = async () => {
    try {
      const { tasks: data } = await clearCompleted();
      tasks = data;
    } catch (error) {
      status = { type: 'error', message: (error as Error).message };
    }
  };

  $: completedCount = tasks.filter((task) => task.completed).length;
  $: remaining = tasks.length - completedCount;
</script>

<main>
  <section class="hero">
    <p class="eyebrow">DBForge Showcase · Fastify + Svelte</p>
    <h1>Realtime tasks backed by PostgreSQL</h1>
    <p class="lead">
      The Fastify API talks directly to a DBForge-managed PostgreSQL instance via the unified framework.
      This Svelte client consumes the API to list, create, and complete tasks without needing an ORM.
    </p>
    <div class="actions">
      <button class="ghost" on:click={loadTasks} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
      <button class="primary" on:click={handleClear} disabled={completedCount === 0}>
        Clear completed ({completedCount})
      </button>
    </div>
  </section>

  <section class="card">
    <form class="new-task" on:submit|preventDefault={handleCreate}>
      <label for="title">Add a task</label>
      <div class="form-row">
        <input
          id="title"
          type="text"
          placeholder="Ship the PostgreSQL example"
          bind:value={newTitle}
        />
        <button type="submit" class="primary" disabled={!newTitle.trim()}>
          Add
        </button>
      </div>
    </form>

    {#if status}
      <p class={`status ${status.type}`}>{status.message}</p>
    {/if}

    <div class="tasks">
      {#if loading}
        <p class="muted">Loading tasks…</p>
      {:else if tasks.length === 0}
        <p class="muted">No tasks yet. Start by creating one above.</p>
      {:else}
        {#each tasks as task}
          <article class={`task ${task.completed ? 'done' : ''}`}>
            <label>
              <input
                type="checkbox"
                checked={task.completed}
                on:change={() => handleToggle(task)}
              />
              <span>
                <strong>{task.title}</strong>
                <small>
                  {task.completed ? 'Completed' : 'In progress'} ·
                  {new Date(task.createdAt).toLocaleString()}
                </small>
              </span>
            </label>
          </article>
        {/each}
      {/if}
    </div>

    <footer class="summary">
      <p>
        <strong>{remaining}</strong> task(s) remaining · Powered by DBForge Framework + PostgreSQL
      </p>
    </footer>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #050817;
    color: #f7fafc;
  }

  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .hero {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .hero h1 {
    font-size: clamp(2rem, 5vw, 3.2rem);
    margin: 0;
  }

  .hero .lead {
    color: #cbd5f5;
    max-width: 60ch;
    line-height: 1.6;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.4em;
    font-size: 0.75rem;
    color: #7dd3fc;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    border: none;
    border-radius: 999px;
    padding: 0.65rem 1.5rem;
    font-size: 0.95rem;
    cursor: pointer;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  button.primary {
    background: linear-gradient(120deg, #34d399, #a7f3d0);
    color: #062c22;
    font-weight: 600;
  }

  button.ghost {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #f7fafc;
  }

  .card {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 2rem;
    backdrop-filter: blur(12px);
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.5);
  }

  .new-task {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .new-task label {
    text-transform: uppercase;
    letter-spacing: 0.3em;
    font-size: 0.75rem;
    color: #9db9f0;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
  }

  .form-row input {
    flex: 1;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(15, 23, 42, 0.6);
    color: #fff;
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }

  .status {
    padding: 0.65rem 1rem;
    border-radius: 12px;
  }

  .status.error {
    background: rgba(248, 113, 113, 0.2);
    color: #fecaca;
  }

  .tasks {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .task {
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem 1rem;
    background: rgba(15, 23, 42, 0.7);
  }

  .task label {
    display: flex;
    gap: 1rem;
    align-items: center;
    cursor: pointer;
  }

  .task input[type='checkbox'] {
    width: 1.2rem;
    height: 1.2rem;
  }

  .task strong {
    font-size: 1rem;
  }

  .task small {
    display: block;
    color: #a5b4fc;
    margin-top: 0.15rem;
  }

  .task.done {
    opacity: 0.6;
  }

  .muted {
    color: #9db9f0;
  }

  .summary {
    margin-top: 1.5rem;
    text-align: center;
    color: #cbd5f5;
  }
</style>
