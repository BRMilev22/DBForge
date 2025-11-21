import { useState, useEffect } from 'react';
import { X, Database as DatabaseIcon, Plus, Code, Table as TableIcon, Download } from 'lucide-react';
import QueryEditor from './QueryEditor';
import SchemaExplorer from './SchemaExplorer';
import ResultsGrid from './ResultsGrid';
import TableContentView from './TableContentView';
import QueryHistory from './QueryHistory';
import { addToQueryHistory } from './QueryHistory';
import { databaseApi } from '../services/api';
import type { DatabaseInstance } from '../types/database';
import DataExportDialog from './DataExportDialog';

interface Tab {
  id: string;
  type: 'query' | 'table' | 'structure';
  title: string;
  tableName?: string;
}

interface DatabaseWorkbenchProps {
  database: DatabaseInstance;
  isOpen: boolean;
  onClose: () => void;
}

interface QueryResult {
  success: boolean;
  queryType: string;
  columns?: string[];
  rows?: Record<string, any>[];
  rowCount?: number;
  executionTimeMs?: number;
  affectedRows?: number;
  message?: string;
  error?: string;
}

interface SchemaInfo {
  databaseName: string;
  tables: any[];
}

export default function DatabaseWorkbench({ database, isOpen, onClose }: DatabaseWorkbenchProps) {
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'query-1', type: 'query', title: 'Query 1' }]);
  const [activeTabId, setActiveTabId] = useState('query-1');
  const [currentDatabase, setCurrentDatabase] = useState<DatabaseInstance>(database);
  const [showHistory, setShowHistory] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState<string>('');
  const [tableRefreshTokens, setTableRefreshTokens] = useState<Record<string, number>>({});
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Refresh database status when opened
  useEffect(() => {
    const refreshStatus = async () => {
      if (isOpen) {
        try {
          const fresh = await databaseApi.getDatabase(database.id);
          setCurrentDatabase(fresh);
        } catch (err) {
          console.error('Failed to refresh database status:', err);
        }
      }
    };
    refreshStatus();
  }, [isOpen, database.id]);

  useEffect(() => {
    if (isOpen && currentDatabase.status === 'RUNNING') {
      loadSchema();
    }
  }, [isOpen, currentDatabase.id, currentDatabase.status]);

  const loadSchema = async () => {
    setSchemaLoading(true);
    try {
      const schemaData = await databaseApi.getSchema(database.id);
      setSchema(schemaData);
    } catch (err) {
      console.error('Failed to load schema:', err);
      // Show error in schema explorer
      setSchema(null);
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleQueryExecute = async (query: string, options?: { explain?: boolean }) => {
    setIsExecuting(true);
    const startTime = Date.now();
    try {
      const result = await databaseApi.executeQuery(database.id, query, 1000, 30, options?.explain);
      setQueryResult(result);
      
      // Add to history
      const executionTime = Date.now() - startTime;
      addToQueryHistory(database.id, query, executionTime, result.success ? 'success' : 'error');
      
      // Refresh schema if query was successful and modifies data or structure
      if (result.success && result.queryType && ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'SET'].includes(result.queryType)) {
        // Add small delay for MySQL/MariaDB/MongoDB/Redis to ensure operation is fully committed
        if (['mysql', 'mariadb', 'mongodb', 'redis'].includes(currentDatabase.databaseType.toLowerCase())) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Immediate refresh for better UX
        await loadSchema();
        
        // Refresh any open table tabs
        const tableTabs = tabs.filter(t => t.type === 'table' && t.tableName);
        if (tableTabs.length) {
          setTableRefreshTokens(prev => {
            const next = { ...prev };
            tableTabs.forEach(tab => {
              if (!tab.tableName) return;
              next[tab.tableName] = (next[tab.tableName] || 0) + 1;
            });
            return next;
          });
        }
      }
    } catch (err) {
      const executionTime = Date.now() - startTime;
      addToQueryHistory(database.id, query, executionTime, 'error');
      setQueryResult({
        success: false,
        queryType: 'ERROR',
        error: err instanceof Error ? err.message : 'Query execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQueryGenerate = (query: string) => {
    // Find or create a query tab
    let queryTab = tabs.find(t => t.type === 'query');
    if (!queryTab) {
      queryTab = { id: `query-${Date.now()}`, type: 'query', title: `Query ${tabs.length + 1}` };
      setTabs([...tabs, queryTab]);
    }
    setActiveTabId(queryTab.id);
    
    // The query will be inserted into the editor through a state update
    setGeneratedQuery(query);
    // Reset after a short delay to allow the editor to receive it
    setTimeout(() => setGeneratedQuery(''), 100);
  };

  const handleHistorySelect = (query: string) => {
    // Ensure a query tab is active, then inject query
    handleQueryGenerate(query);
    setShowHistory(false);
  };

  const handleTableSelect = (tableName: string) => {
    // Check if tab already exists
    const existingTab = tabs.find(t => t.type === 'table' && t.tableName === tableName);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const newTab: Tab = {
      id: `table-${Date.now()}`,
      type: 'table',
      title: tableName,
      tableName,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTableStructure = (tableName: string) => {
    // Check if tab already exists
    const existingTab = tabs.find(t => t.type === 'structure' && t.tableName === tableName);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Create new tab
    const newTab: Tab = {
      id: `structure-${Date.now()}`,
      type: 'structure',
      title: `${tableName} (Structure)`,
      tableName,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const addQueryTab = () => {
    const queryCount = tabs.filter(t => t.type === 'query').length;
    const newTab: Tab = {
      id: `query-${Date.now()}`,
      type: 'query',
      title: `Query ${queryCount + 1}`,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    if (newTabs.length === 0) {
      // Always keep at least one query tab
      const defaultTab: Tab = { id: 'query-default', type: 'query', title: 'Query 1' };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    } else {
      setTabs(newTabs);
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const tableInfo = activeTab.tableName && schema?.tables.find(t => t.name === activeTab.tableName);

  const handleOpenExport = async () => {
    if (!schema && !schemaLoading) {
      await loadSchema();
    }
    setShowExportDialog(true);
  };

  if (!isOpen) return null;

  if (currentDatabase.status !== 'RUNNING') {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-8 max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <DatabaseIcon className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">Database Not Running</h3>
          <p className="text-sm text-zinc-400 mb-1">
            Status: <span className="text-amber-400 font-medium">{currentDatabase.status}</span>
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            The database must be running to use the query interface.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 p-1.5 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <DatabaseIcon className="w-full h-full text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{currentDatabase.instanceName}</h2>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{currentDatabase.databaseType}</span>
                <span>•</span>
                <span>Query Interface</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenExport}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Schema Explorer */}
          <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950/50">
            <SchemaExplorer 
              schema={schema} 
              isLoading={schemaLoading}
              databaseType={currentDatabase.databaseType}
              onTableSelect={handleTableSelect}
              onTableStructure={handleTableStructure}
              onRefresh={loadSchema}
              onQueryGenerate={handleQueryGenerate}
              onQueryExecute={handleQueryExecute}
            />
          </div>

          {/* Right: Tabs + Content */}
          <div className="flex-1 flex flex-col">
            {/* Tab Bar */}
            <div className="flex items-center gap-0.5 px-2 py-1 bg-zinc-950/50 border-b border-zinc-800 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition ${
                    activeTabId === tab.id
                      ? 'bg-zinc-900/70 text-zinc-200 border-t border-l border-r border-zinc-800'
                      : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {tab.type === 'query' ? (
                    <Code className="w-3.5 h-3.5" />
                  ) : (
                    <TableIcon className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs font-medium whitespace-nowrap">{tab.title}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition hover:bg-zinc-800 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addQueryTab}
                className="ml-2 p-1.5 rounded hover:bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 transition"
                title="New Query Tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tab Content */}
            {activeTab.type === 'query' && (
              <div className="relative flex-1 flex flex-col">
                <div className="h-[45%] border-b border-zinc-800">
                  <QueryEditor
                    databaseId={currentDatabase.id}
                    databaseType={currentDatabase.databaseType}
                    onQueryExecute={handleQueryExecute}
                    isExecuting={isExecuting}
                    generatedQuery={generatedQuery}
                    onShowHistory={() => setShowHistory(true)}
                  />
                </div>
                <div className="flex-1">
                  <ResultsGrid result={queryResult} />
                </div>

                {showHistory && (
                  <div className="absolute inset-y-0 right-0 w-80 max-w-full border-l border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 z-20 flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950/90">
                      <div className="text-xs font-medium text-zinc-400">Query History</div>
                      <button
                        onClick={() => setShowHistory(false)}
                        className="px-2 py-1 text-xs rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                      >
                        Close
                      </button>
                    </div>
                    <QueryHistory
                      databaseId={currentDatabase.id}
                      onQuerySelect={handleHistorySelect}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab.type === 'table' && activeTab.tableName && (
              <div className="flex-1">
                <TableContentView
                  key={activeTab.id}
                  databaseId={currentDatabase.id}
                  databaseType={currentDatabase.databaseType}
                  tableName={activeTab.tableName}
                  primaryKeys={
                    schema?.tables
                      .find((t) => t.name === activeTab.tableName)
                      ?.columns.filter((c: any) => c.primaryKey)
                      .map((c: any) => c.name)
                  }
                  refreshSignal={tableRefreshTokens[activeTab.tableName] || 0}
                  onExecuteQuery={(query, limit) => databaseApi.executeQuery(currentDatabase.id, query, limit, 30)}
                />
              </div>
            )}

            {activeTab.type === 'structure' && activeTab.tableName && (
              <div className="flex-1 overflow-auto p-4 bg-zinc-950/30">
                <div className="max-w-5xl">
                  {/* Redis Key Pattern Info */}
                  {currentDatabase.databaseType.toLowerCase() === 'redis' ? (
                    <>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-1">{activeTab.tableName}</h3>
                        <div className="text-sm text-zinc-500">
                          KEY PATTERN
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-300 mb-2">Redis Key-Value Store</h4>
                            <div className="text-sm text-zinc-400">
                              <p className="mb-2">Redis is a schema-less key-value store. This pattern groups related keys together.</p>
                              <p className="text-zinc-500">Click the data tab to view all keys matching this pattern and their values.</p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-zinc-800">
                            <div className="text-xs text-zinc-500">
                              <p className="font-semibold text-zinc-400 mb-1">Common Operations:</p>
                              <ul className="space-y-1 ml-4 list-disc">
                                <li>View all keys: <code className="text-violet-400">KEYS {activeTab.tableName}</code></li>
                                <li>Get a value: <code className="text-violet-400">GET &lt;key&gt;</code></li>
                                <li>Set a value: <code className="text-violet-400">SET &lt;key&gt; &lt;value&gt;</code></li>
                                <li>Delete a key: <code className="text-violet-400">DEL &lt;key&gt;</code></li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : currentDatabase.databaseType.toLowerCase() === 'mongodb' ? (
                    <>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-1">{activeTab.tableName}</h3>
                        <div className="text-sm text-zinc-500">
                          COLLECTION
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-semibold text-zinc-300 mb-2">Collection Information</h4>
                            <div className="text-sm text-zinc-400">
                              <p className="mb-2">MongoDB uses a flexible schema model. Documents in this collection can have different fields.</p>
                              <p className="text-zinc-500">To view the structure, examine the documents in the data tab or run:</p>
                              <pre className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 text-zinc-300 font-mono text-xs">
                                db.{activeTab.tableName}.findOne()
                              </pre>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-zinc-800">
                            <div className="text-xs text-zinc-500">
                              <p className="font-semibold text-zinc-400 mb-1">Common Operations:</p>
                              <ul className="space-y-1 ml-4 list-disc">
                                <li>View all documents: <code className="text-violet-400">db.{activeTab.tableName}.find()</code></li>
                                <li>Count documents: <code className="text-violet-400">db.{activeTab.tableName}.countDocuments()</code></li>
                                <li>Get indexes: <code className="text-violet-400">db.{activeTab.tableName}.getIndexes()</code></li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : tableInfo ? (
                    <>
                      {/* SQL Table Header */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-zinc-100 mb-1">{tableInfo.name}</h3>
                        <div className="text-sm text-zinc-500">
                          {tableInfo.rowCount !== null && `${tableInfo.rowCount.toLocaleString()} rows`} • {tableInfo.type}
                        </div>
                      </div>

                      {/* Columns Table */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-zinc-300 mb-2">Columns ({tableInfo.columns.length})</h4>
                    <div className="border border-zinc-800 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-zinc-900/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Nullable</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Default</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Key</th>
                          </tr>
                        </thead>
                        <tbody className="bg-zinc-950/50">
                          {tableInfo.columns.map((col: any, idx: number) => (
                            <tr key={idx} className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition">
                              <td className="px-3 py-2 text-sm text-zinc-300 font-mono">{col.name}</td>
                              <td className="px-3 py-2 text-sm text-zinc-400 font-mono">
                                {col.dataType}{col.maxLength > 0 && `(${col.maxLength})`}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {col.nullable ? (
                                  <span className="text-emerald-400">YES</span>
                                ) : (
                                  <span className="text-zinc-600">NO</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-zinc-500 font-mono">
                                {col.defaultValue || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {col.primaryKey && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                                    PRIMARY
                                  </span>
                                )}
                                {col.autoIncrement && (
                                  <span className="ml-1 px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-xs font-medium border border-violet-500/30">
                                    AUTO
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Indexes */}
                  {tableInfo.indexes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-300 mb-2">Indexes ({tableInfo.indexes.length})</h4>
                      <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-zinc-900/50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400 uppercase">Columns</th>
                            </tr>
                          </thead>
                          <tbody className="bg-zinc-950/50">
                            {tableInfo.indexes.map((idx: any, i: number) => (
                              <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-900/30 transition">
                                <td className="px-3 py-2 text-sm text-zinc-300 font-mono">{idx.name}</td>
                                <td className="px-3 py-2 text-sm">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                    idx.type === 'PRIMARY' 
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                      : idx.type === 'UNIQUE'
                                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                                      : 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'
                                  }`}>
                                    {idx.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-zinc-400 font-mono">{idx.columns.join(', ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DataExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        database={currentDatabase}
        schemaTables={schema?.tables}
        loadingSchema={schemaLoading}
      />
    </div>
  );
}
