import { useState, useEffect } from 'react';
import { Clock, Star, Trash2, Copy, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  executionTime?: number;
  status: 'success' | 'error';
  bookmarked: boolean;
  // Legacy items may not have been pre-cleaned
  _cleaned?: string;
}

interface QueryHistoryProps {
  databaseId: number;
  onQuerySelect: (query: string) => void;
}

export default function QueryHistory({ databaseId, onQuerySelect }: QueryHistoryProps) {
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    // Load history from localStorage
    const stored = localStorage.getItem(`query_history_${databaseId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      setHistory(parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
        _cleaned: cleanQueryForDisplay(item.query || '')
      })));
    }
  }, [databaseId]);

  const saveHistory = (newHistory: QueryHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem(`query_history_${databaseId}`, JSON.stringify(newHistory));
  };

  const toggleBookmark = (id: string) => {
    const newHistory = history.map(item =>
      item.id === id ? { ...item, bookmarked: !item.bookmarked } : item
    );
    saveHistory(newHistory);
  };

  const deleteItem = (id: string) => {
    saveHistory(history.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setShowClearConfirm(true);
  };

  const filteredHistory = filter === 'bookmarked' 
    ? history.filter(item => item.bookmarked)
    : history;

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">Query History</h3>
          <button
            onClick={clearAll}
            className="text-xs text-zinc-500 hover:text-rose-400 transition"
          >
            Clear All
          </button>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilter('bookmarked')}
            className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition ${
              filter === 'bookmarked'
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            Saved ({history.filter(h => h.bookmarked).length})
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Clock className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">
              {filter === 'bookmarked' ? 'No bookmarked queries' : 'No query history yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 hover:bg-zinc-900/50 transition group"
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleBookmark(item.id)}
                    className="mt-1"
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition ${
                        item.bookmarked
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-600 hover:text-amber-400'
                      }`}
                    />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <pre className="text-xs text-zinc-300 font-mono mb-2 whitespace-pre-wrap break-words">
                      {cleanQueryForDisplay(item.query)}
                    </pre>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                      {item.executionTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.executionTime}ms
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded ${
                        item.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => onQuerySelect(item.query)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-violet-400 transition"
                      title="Load Query"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(item._cleaned || cleanQueryForDisplay(item.query))}
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-sky-400 transition"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Query History"
        message="Remove all saved query history for this database?"
        confirmLabel="Clear History"
        variant="danger"
        onConfirm={() => {
          saveHistory([]);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

// Export function to add query to history
export function addToQueryHistory(
  databaseId: number,
  query: string,
  executionTime: number,
  status: 'success' | 'error'
) {
  const cleanedQuery = cleanQueryForDisplay(query);
  
  if (!cleanedQuery.trim()) return;

  const stored = localStorage.getItem(`query_history_${databaseId}`);
  const history = stored ? JSON.parse(stored) : [];
  
  const newItem = {
    id: Date.now().toString(),
    query: cleanedQuery,
    timestamp: new Date().toISOString(),
    executionTime,
    status,
    bookmarked: false,
    _cleaned: cleanedQuery
  };
  
  // Keep last 100 queries
  const newHistory = [newItem, ...history].slice(0, 100);
  localStorage.setItem(`query_history_${databaseId}`, JSON.stringify(newHistory));
}

// Remove comments and unnecessary whitespace for storage/display
function cleanQueryForDisplay(query: string) {
  if (!query) return '';

  // Strip block comments
  let cleaned = query.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // Strip line comments and empty lines
  const lines = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('--') && !line.startsWith('#') && !line.startsWith('//'));

  cleaned = lines.join('\n').trim();
  return cleaned;
}
