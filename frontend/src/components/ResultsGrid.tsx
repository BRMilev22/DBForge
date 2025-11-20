import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { Download, Copy, Check, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ResultsGridProps {
  result: QueryResult | null;
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

export default function ResultsGrid({ result }: ResultsGridProps) {
  const [copied, setCopied] = useState(false);

  const columnDefs = useMemo(() => {
    if (!result?.columns) return [];
    return result.columns.map((col) => ({
      field: col,
      headerName: col,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }));
  }, [result?.columns]);

  const handleExportCSV = () => {
    if (!result?.rows || !result?.columns) return;

    const csv = [
      result.columns.join(','),
      ...result.rows.map(row => 
        result.columns!.map(col => {
          const value = row[col];
          const stringValue = value === null ? 'NULL' : String(value);
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCopyResults = async () => {
    if (!result?.rows || !result?.columns) return;

    const text = [
      result.columns.join('\t'),
      ...result.rows.map(row => 
        result.columns!.map(col => {
          const value = row[col];
          return value === null ? 'NULL' : String(value);
        }).join('\t')
      )
    ].join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950/30">
        <div className="text-center text-zinc-500 text-sm">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Clock className="w-6 h-6 text-zinc-600" />
          </div>
          <p>Run a query to see results</p>
        </div>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="flex flex-col h-full bg-zinc-950/30">
        <div className="px-4 py-3 border-b border-zinc-800/50 bg-rose-500/10">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-medium text-rose-400">Query Failed</span>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <pre className="text-sm text-rose-300 font-mono whitespace-pre-wrap">
              {result.error}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Non-SELECT/FIND/KEYS/GET/EXPLAIN queries (INSERT, UPDATE, DELETE)
  if (result.queryType !== 'SELECT' && result.queryType !== 'FIND' && result.queryType !== 'KEYS' && result.queryType !== 'GET' && result.queryType !== 'EXPLAIN') {
    return (
      <div className="flex flex-col h-full bg-zinc-950/30">
        <div className="px-4 py-3 border-b border-zinc-800/50 bg-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Query Executed Successfully</span>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="space-y-2">
              <div className="text-sm text-emerald-300">
                <span className="font-medium">{result.queryType}</span> query completed
              </div>
              {result.affectedRows !== undefined && (
                <div className="text-sm text-zinc-400">
                  Rows affected: <span className="font-medium text-emerald-400">{result.affectedRows}</span>
                </div>
              )}
              {result.executionTimeMs !== undefined && (
                <div className="text-sm text-zinc-400">
                  Execution time: <span className="font-medium text-violet-400">{result.executionTimeMs}ms</span>
                </div>
              )}
              {result.message && (
                <div className="text-sm text-zinc-500 mt-2">
                  {result.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SELECT query results
  return (
    <div className="flex flex-col h-full bg-zinc-950/30">
      {/* Results Header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/50">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-500">
              {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
            </span>
          </div>
          {result.executionTimeMs !== undefined && (
            <>
              <div className="text-zinc-700">•</div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-zinc-500">{result.executionTimeMs}ms</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyResults}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-300 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-300 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* AG Grid */}
      <div className="flex-1 ag-theme-quartz-dark">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={result.rows || []}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            sortable: true,
            filter: true,
            resizable: true,
          }}
          domLayout="normal"
          rowSelection="multiple"
          animateRows={true}
          pagination={true}
          paginationPageSize={100}
          paginationPageSizeSelector={[50, 100, 200, 500]}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
