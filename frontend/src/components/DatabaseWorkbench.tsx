import { useState, useEffect } from 'react';
import { X, Database as DatabaseIcon, Loader2, Plus, Code, Table as TableIcon, History, PanelLeftClose, PanelLeft } from 'lucide-react';
import QueryEditor from './QueryEditor';
import SchemaExplorer from './SchemaExplorer';
import ResultsGrid from './ResultsGrid';
import QueryHistory, { addToQueryHistory } from './QueryHistory';
import ConnectionInfo from './ConnectionInfo';
import { databaseApi } from '../services/api';
import type { DatabaseInstance } from '../types/database';

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
  const [tableData, setTableData] = useState<Record<string, any>>({});
  const [currentDatabase, setCurrentDatabase] = useState<DatabaseInstance>(database);
  const [showHistory, setShowHistory] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState<string>('');

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

  const handleQueryExecute = async (query: string) => {
    setIsExecuting(true);
    const startTime = Date.now();
    try {
      const result = await databaseApi.executeQuery(database.id, query, 1000, 30);
      setQueryResult(result);
      
      // Add to history
      const executionTime = Date.now() - startTime;
      addToQueryHistory(database.id, query, executionTime, result.success ? 'success' : 'error');
      
      // Refresh schema if query was successful and modifies data or structure
      if (result.success && result.queryType && ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(result.queryType)) {
        // Add small delay for MySQL/MariaDB to ensure table is fully created
        if (['mysql', 'mariadb'].includes(currentDatabase.databaseType.toLowerCase())) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Immediate refresh for better UX
        await loadSchema();
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

  const handleQuerySelect = (query: string) => {
    setGeneratedQuery(query);
    setShowHistory(false);
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
  };

  const handleTableSelect = async (tableName: string) => {
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

    // Load table data
    setIsExecuting(true);
    try {
      const result = await databaseApi.executeQuery(database.id, `SELECT * FROM ${tableName} LIMIT 100`, 100, 30);
      setTableData({ ...tableData, [tableName]: result });
    } catch (err) {
      setTableData({ ...tableData, [tableName]: {
        success: false,
        queryType: 'ERROR',
        error: err instanceof Error ? err.message : 'Failed to load table data',
      }});
    } finally {
      setIsExecuting(false);
    }
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Schema Explorer */}
          <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-950/50">
            <SchemaExplorer 
              schema={schema} 
              isLoading={schemaLoading}
              onTableSelect={handleTableSelect}
              onTableStructure={handleTableStructure}
              onRefresh={loadSchema}
              onQueryGenerate={handleQueryGenerate}
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
              <>
                <div className="h-[45%] border-b border-zinc-800">
                  <QueryEditor
                    databaseId={currentDatabase.id}
                    databaseType={currentDatabase.databaseType}
                    onQueryExecute={handleQueryExecute}
                    isExecuting={isExecuting}
                  />
                </div>
                <div className="flex-1">
                  <ResultsGrid result={queryResult} />
                </div>
              </>
            )}

            {activeTab.type === 'table' && activeTab.tableName && (
              <div className="flex-1">
                {isExecuting && !tableData[activeTab.tableName] ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-2" />
                      <p className="text-sm text-zinc-400">Loading table data...</p>
                    </div>
                  </div>
                ) : (
                  <ResultsGrid result={tableData[activeTab.tableName] || null} />
                )}
              </div>
            )}

            {activeTab.type === 'structure' && tableInfo && (
              <div className="flex-1 overflow-auto p-4 bg-zinc-950/30">
                <div className="max-w-5xl">
                  {/* Table Header */}
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
                          {tableInfo.columns.map((col, idx) => (
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
                            {tableInfo.indexes.map((idx, i) => (
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
