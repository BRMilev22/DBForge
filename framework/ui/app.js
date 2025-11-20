import { DbForgeClient } from '../src/browser-client.js';

const state = {
  client: null,
};

const connectForm = document.getElementById('connect-form');
const connectionType = document.getElementById('connection-type');
const statusEl = document.getElementById('connection-status');
const queryInput = document.getElementById('query-input');
const queryResult = document.getElementById('query-result');

const modeSections = {
  token: document.querySelector('.mode-token'),
  connectionString: document.querySelector('.mode-connectionString'),
  credentials: document.querySelector('.mode-credentials'),
};

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#ff5c98' : '#8fe9ff';
};

const showResult = (result) => {
  queryResult.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
};

const toggleModes = () => {
  Object.values(modeSections).forEach((section) => section.classList.add('hidden'));
  const mode = connectionType.value;
  if (modeSections[mode]) {
    modeSections[mode].classList.remove('hidden');
  }

  if (mode !== 'token') {
    setStatus('Direct DB connections require the Node version of the framework. Use API token mode inside the browser UI.', true);
  } else {
    setStatus('');
  }
};

connectionType.addEventListener('change', toggleModes);
toggleModes();

const buildClient = () => {
  if (connectionType.value !== 'token') {
    throw new Error('Browser UI only supports API token mode. Use the Node version for direct connections.');
  }
  return DbForgeClient.fromApiToken({
    apiUrl: document.getElementById('api-url').value || undefined,
    apiToken: document.getElementById('api-token').value,
  });
};

connectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const client = buildClient();
    setStatus('Connecting...');
    const metadata = await client.connect();
    state.client = client;
    if (metadata && metadata.instanceName) {
      setStatus(`Connected to ${metadata.instanceName}`);
    } else {
      setStatus('Connected successfully');
    }
  } catch (error) {
    console.error(error);
    setStatus(`Connection failed: ${error.message}`, true);
  }
});

const runQuery = async (sql) => {
  if (!state.client) {
    setStatus('Connect first to run queries', true);
    return;
  }
  if (!sql) {
    setStatus('Provide a SQL statement', true);
    return;
  }
  try {
    setStatus('Running query...');
    const result = await state.client.query(sql);
    showResult(result);
    setStatus('Query completed');
  } catch (error) {
    console.error(error);
    showResult({ error: error.message });
    setStatus('Query failed', true);
  }
};

const quickQueries = {
  select: () => 'SELECT * FROM users LIMIT 5;',
  insert: () => `INSERT INTO users (name, email, created_at) VALUES ('FrameworkUser', 'framework@example.com', NOW());`,
  delete: () => `DELETE FROM users WHERE email = 'framework@example.com';`,
};

queryInput.value = quickQueries.select();

document.getElementById('run-query').addEventListener('click', () => {
  runQuery(queryInput.value.trim());
});

document.getElementById('select-users').addEventListener('click', () => {
  const sql = quickQueries.select();
  queryInput.value = sql;
  runQuery(sql);
});

document.getElementById('insert-user').addEventListener('click', () => {
  const sql = quickQueries.insert();
  queryInput.value = sql;
  runQuery(sql);
});

document.getElementById('delete-user').addEventListener('click', () => {
  const sql = quickQueries.delete();
  queryInput.value = sql;
  runQuery(sql);
});
