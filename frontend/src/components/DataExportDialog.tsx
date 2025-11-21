import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Database as DatabaseIcon, Download, Loader2, X } from 'lucide-react';
import type { DatabaseInstance } from '../types/database';
import { databaseApi } from '../services/api';

interface TableEntry {
  name: string;
  type?: string;
  rowCount?: number | null;
}

interface DataExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  database: DatabaseInstance;
  schemaTables?: TableEntry[];
  loadingSchema?: boolean;
}

type ExportFormat = 'csv' | 'json' | 'sql';

export default function DataExportDialog({
  isOpen,
  onClose,
  database,
  schemaTables,
  loadingSchema,
}: DataExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [includeSchema, setIncludeSchema] = useState(true);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [limit, setLimit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dbType = database.databaseType.toLowerCase();
  const isSqlDb = ['postgresql', 'postgres', 'mysql', 'mariadb'].includes(dbType);

  const formatOptions = useMemo(() => {
    const opts: Array<{ value: ExportFormat; label: string; helper: string; disabled?: boolean }> = [
      { value: 'csv', label: 'CSV', helper: 'Spreadsheet friendly' },
      { value: 'json', label: 'JSON', helper: 'APIs & documents' },
    ];
    opts.push({
      value: 'sql',
      label: 'SQL',
      helper: 'INSERT statements',
      disabled: !isSqlDb,
    });
    return opts;
  }, [isSqlDb]);

  const allTables = useMemo(() => schemaTables?.map((t) => t.name) ?? [], [schemaTables]);
  const multipleTables = (scope === 'all' ? allTables.length : selectedTables.length) > 1;

  useEffect(() => {
    if (isOpen && schemaTables?.length) {
      setSelectedTables(schemaTables.map((t) => t.name));
    }
  }, [isOpen, schemaTables]);

  useEffect(() => {
    if (!isSqlDb && format === 'sql') {
      setFormat('csv');
    }
  }, [format, isSqlDb]);

  if (!isOpen) return null;

  const toggleTable = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName) ? prev.filter((t) => t !== tableName) : [...prev, tableName]
    );
  };

  const handleExport = async () => {
    if (scope === 'selected' && selectedTables.length === 0) {
      setError('Select at least one table/collection or choose "Entire database".');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        format,
        tables: scope === 'selected' ? selectedTables : undefined,
        includeSchema: format === 'sql' && isSqlDb ? includeSchema : undefined,
        includeHeaders: format === 'csv' ? includeHeaders : undefined,
        limit: limit > 0 ? limit : undefined,
      };

      const { blob, filename } = await databaseApi.exportDatabase(database.id, payload);
      const fallbackExt = multipleTables ? 'zip' : format;

      const downloadName =
        filename ||
        `${database.instanceName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'export'}-export.${fallbackExt}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      anchor.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Export failed. Please try again or reduce the selection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-3xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Download className="w-full h-full text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold text-zinc-100">Export data</div>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <DatabaseIcon className="w-3.5 h-3.5" />
                <span>
                  {database.instanceName} • {database.databaseType}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            Exports are generated server-side. Selecting multiple tables or collections will download a
            single .zip with one file per table.
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div>
                <div className="text-sm text-zinc-500 mb-2">Format</div>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={opt.disabled}
                      onClick={() => setFormat(opt.value)}
                      className={`p-3 rounded border text-left transition ${
                        format === opt.value
                          ? 'border-violet-500/40 bg-violet-500/10 text-violet-200'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{opt.label}</div>
                        {format === opt.value && (
                          <Check className="w-4 h-4 text-violet-300" />
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{opt.helper}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-zinc-500">Scope</div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="radio"
                      name="export-scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                    />
                    Entire database
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="radio"
                      name="export-scope"
                      checked={scope === 'selected'}
                      onChange={() => setScope('selected')}
                      disabled={!schemaTables?.length}
                    />
                    Choose tables/collections
                  </label>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 max-h-56 overflow-auto">
                  {loadingSchema ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading schema...
                    </div>
                  ) : schemaTables?.length ? (
                    schemaTables.map((table) => (
                      <label
                        key={table.name}
                        className={`flex items-center justify-between px-4 py-2 border-b border-zinc-900/80 text-sm ${
                          scope === 'selected' ? 'cursor-pointer' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={scope !== 'selected'}
                            checked={scope === 'all' || selectedTables.includes(table.name)}
                            onChange={() => toggleTable(table.name)}
                          />
                          <div>
                            <div className="text-zinc-200 font-medium">{table.name}</div>
                            <div className="text-xs text-zinc-500">
                              {table.type || 'TABLE'}
                              {typeof table.rowCount === 'number' &&
                                ` • ${table.rowCount.toLocaleString()} rows`}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-zinc-500">
                      Schema is not available yet. Refresh the schema to pick tables.
                    </div>
                  )}
                </div>

                {schemaTables?.length ? (
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <button
                      onClick={() => setSelectedTables(allTables)}
                      disabled={scope !== 'selected' || !schemaTables.length}
                      className="px-3 py-1 rounded border border-zinc-800 hover:border-zinc-700 text-zinc-300 disabled:opacity-50"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedTables([])}
                      disabled={scope !== 'selected'}
                      className="px-3 py-1 rounded border border-zinc-800 hover:border-zinc-700 text-zinc-300 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                <div className="text-sm text-zinc-400">Options</div>

                {format === 'csv' && (
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                    />
                    Include column headers
                  </label>
                )}

                {format === 'sql' && isSqlDb && (
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={includeSchema}
                      onChange={(e) => setIncludeSchema(e.target.checked)}
                    />
                    Comment column definitions
                  </label>
                )}

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Row limit (0 = all)</label>
                  <input
                    type="number"
                    min={0}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value) || 0)}
                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            {multipleTables ? 'Multiple selections download as .zip' : 'Single selection downloads one file'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
