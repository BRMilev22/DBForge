import { useState } from 'react';
import { Download, Upload, FileText, Database, X } from 'lucide-react';

interface ExportImportDialogProps {
  databaseId: number;
  tableName?: string;
  isOpen: boolean;
  mode: 'export' | 'import';
  onClose: () => void;
  onExecuteQuery: (query: string) => Promise<any>;
}

export default function ExportImportDialog({
  databaseId: _databaseId,
  tableName,
  isOpen,
  mode,
  onClose,
  onExecuteQuery
}: ExportImportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'sql' | 'json'>('csv');
  const [options, setOptions] = useState({
    includeHeaders: true,
    includeCreateTable: true,
    includeData: true,
    limit: 0
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      if (!tableName) {
        alert('No table selected');
        return;
      }

      // Fetch table data
      const limitClause = options.limit > 0 ? ` LIMIT ${options.limit}` : '';
      const result = await onExecuteQuery(`SELECT * FROM ${tableName}${limitClause}`);

      if (!result.success) {
        alert('Failed to fetch data');
        return;
      }

      let content = '';
      let filename = '';

      switch (format) {
        case 'csv':
          content = exportCSV(result.columns, result.rows, options.includeHeaders);
          filename = `${tableName}_export.csv`;
          break;
        
        case 'json':
          content = JSON.stringify(result.rows, null, 2);
          filename = `${tableName}_export.json`;
          break;
        
        case 'sql':
          content = exportSQL(tableName, result.columns, result.rows, options);
          filename = `${tableName}_export.sql`;
          break;
      }

      // Download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (columns: string[], rows: any[], includeHeaders: boolean): string => {
    let csv = '';
    
    if (includeHeaders) {
      csv += columns.join(',') + '\n';
    }
    
    rows.forEach(row => {
      const values = columns.map(col => {
        const value = row[col];
        if (value === null) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });
    
    return csv;
  };

  const exportSQL = (table: string, columns: string[], rows: any[], opts: typeof options): string => {
    let sql = '';
    
    if (opts.includeCreateTable) {
      sql += `-- Table structure for ${table}\n`;
      sql += `-- (CREATE TABLE statement would go here)\n\n`;
    }
    
    if (opts.includeData) {
      sql += `-- Data for table ${table}\n`;
      rows.forEach(row => {
        const cols = columns.join(', ');
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
          return value;
        }).join(', ');
        
        sql += `INSERT INTO ${table} (${cols}) VALUES (${values});\n`;
      });
    }
    
    return sql;
  };

  const handleImport = async (file: File) => {
    setLoading(true);
    try {
      const content = await file.text();
      
      if (format === 'sql') {
        // Split by semicolons and execute each statement
        const statements = content.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          await onExecuteQuery(stmt.trim());
        }
      } else if (format === 'csv') {
        // Parse CSV and generate INSERT statements
        const lines = content.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const valueStr = values.map(v => {
            v = v.trim();
            if (v === '' || v === 'NULL') return 'NULL';
            return `'${v.replace(/'/g, "''")}'`;
          }).join(', ');
          
          await onExecuteQuery(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${valueStr})`);
        }
      }
      
      alert('Import completed successfully!');
      onClose();
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {mode === 'export' ? (
              <Download className="w-5 h-5 text-violet-400" />
            ) : (
              <Upload className="w-5 h-5 text-violet-400" />
            )}
            <h3 className="text-lg font-semibold text-zinc-100">
              {mode === 'export' ? 'Export' : 'Import'} Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {tableName && (
            <div>
              <div className="text-sm text-zinc-500 mb-1">Table</div>
              <div className="text-zinc-300 font-medium">{tableName}</div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <div className="text-sm text-zinc-500 mb-2">Format</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('csv')}
                className={`p-3 rounded border transition ${
                  format === 'csv'
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">CSV</div>
              </button>
              <button
                onClick={() => setFormat('sql')}
                className={`p-3 rounded border transition ${
                  format === 'sql'
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Database className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">SQL</div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`p-3 rounded border transition ${
                  format === 'json'
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">JSON</div>
              </button>
            </div>
          </div>

          {mode === 'export' && (
            <>
              {/* Export Options */}
              <div className="space-y-2">
                <div className="text-sm text-zinc-500 mb-2">Options</div>
                
                {format === 'csv' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={options.includeHeaders}
                      onChange={(e) => setOptions({ ...options, includeHeaders: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-zinc-300">Include column headers</span>
                  </label>
                )}

                {format === 'sql' && (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.includeCreateTable}
                        onChange={(e) => setOptions({ ...options, includeCreateTable: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-zinc-300">Include CREATE TABLE</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.includeData}
                        onChange={(e) => setOptions({ ...options, includeData: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-zinc-300">Include data</span>
                    </label>
                  </>
                )}

                <div>
                  <label className="text-sm text-zinc-400 block mb-1">Row limit (0 = all)</label>
                  <input
                    type="number"
                    value={options.limit}
                    onChange={(e) => setOptions({ ...options, limit: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-300 text-sm w-full"
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'import' && (
            <div>
              <label className="text-sm text-zinc-500 block mb-2">Select file</label>
              <input
                type="file"
                accept={format === 'csv' ? '.csv' : format === 'sql' ? '.sql' : '.json'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
                className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-500/20 file:text-violet-400 hover:file:bg-violet-500/30 file:cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'export' && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-zinc-400 hover:text-zinc-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 rounded bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
