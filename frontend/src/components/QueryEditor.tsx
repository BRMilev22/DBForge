import { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Clock, Sparkles, Copy, Eraser, Book, History } from 'lucide-react';
import type { editor } from 'monaco-editor';

interface QueryEditorProps {
  databaseId: number;
  databaseType: string;
  onQueryExecute: (query: string) => Promise<void>;
  isExecuting: boolean;
  initialQuery?: string;
  onShowHistory?: () => void;
}

export default function QueryEditor({ 
  databaseId, 
  databaseType, 
  onQueryExecute, 
  isExecuting,
  initialQuery,
  onShowHistory
}: QueryEditorProps) {
  
  const getDefaultQuery = () => {
    const dbTypeLower = databaseType.toLowerCase();
    
    if (dbTypeLower === 'postgresql' || dbTypeLower === 'postgres') {
      return `-- Welcome to DBForge Query Editor!
-- Create your first table:

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some data:
-- INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');

-- Query your data:
-- SELECT * FROM users;`;
    } else if (dbTypeLower === 'mysql' || dbTypeLower === 'mariadb') {
      return `-- Welcome to DBForge Query Editor!
-- Create your first table:

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some data:
-- INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com');

-- Query your data:
-- SELECT * FROM users;`;
    } else if (dbTypeLower === 'mongodb') {
      return `// Welcome to DBForge MongoDB Query Editor!
// Create your first document:

db.users.insertOne({
  name: "John Doe",
  email: "john@example.com",
  created_at: new Date()
});

// Query your data:
// db.users.find({});`;
    } else if (dbTypeLower === 'redis') {
      return `# Welcome to DBForge Redis Query Editor!
# Set a key-value pair:

SET user:1:name "John Doe"
SET user:1:email "john@example.com"

# Get a value:
# GET user:1:name

# List all keys:
# KEYS *`;
    }
    
    return `-- Welcome to DBForge Query Editor!
-- Start writing your queries here...`;
  };
  
  const [query, setQuery] = useState(initialQuery || getDefaultQuery());

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleExecute = () => {
    if (!query.trim() || isExecuting) return;
    
    // Get selected text or full query
    const editor = editorRef.current;
    const selectedText = editor?.getModel()?.getValueInRange(editor.getSelection()!);
    const queryToRun = selectedText?.trim() || query;
    
    onQueryExecute(queryToRun);
  };

  const formatQuery = () => {
    if (!editorRef.current) return;
    editorRef.current.getAction('editor.action.formatDocument')?.run();
  };

  const clearQuery = () => {
    if (confirm('Clear the editor?')) {
      setQuery('');
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const getLanguage = () => {
    const type = databaseType.toLowerCase();
    if (type === 'mongodb') return 'javascript';
    return 'sql';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 font-medium">Query Editor</div>
          <div className="text-xs text-zinc-600">•</div>
          <div className="text-xs text-zinc-600">{databaseType}</div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={formatQuery}
              className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-violet-400 transition"
              title="Format SQL (Prettier)"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={copyQuery}
              className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-sky-400 transition"
              title="Copy Query"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={clearQuery}
              className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 transition"
              title="Clear Editor"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            {onShowHistory && (
              <button
                onClick={onShowHistory}
                className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-amber-400 transition"
                title="Query History"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-600">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">Ctrl</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">Enter</kbd>
            {' to run'}
          </div>
          
          <button
            onClick={handleExecute}
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/25 disabled:shadow-none"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Query
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative" onKeyDown={handleKeyDown}>
        <Editor
          height="100%"
          language={getLanguage()}
          value={query}
          onChange={(value) => setQuery(value || '')}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        />
      </div>
    </div>
  );
}
