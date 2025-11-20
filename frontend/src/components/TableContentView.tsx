import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Download, Filter, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface TableContentViewProps {
  databaseId: number;
  databaseType: string;
  tableName: string;
  primaryKeys?: string[];
  refreshSignal?: number;
  onExecuteQuery: (query: string, limit?: number) => Promise<any>;
}

export default function TableContentView({
  databaseId: _databaseId,
  databaseType,
  tableName,
  primaryKeys,
  refreshSignal,
  onExecuteQuery,
}: TableContentViewProps) {
  const [rowData, setRowData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact>(null);

  const normalizedDb = databaseType.toLowerCase();

  useEffect(() => {
    loadTableData();
  }, [tableName, normalizedDb, refreshSignal]);

  const loadTableData = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = buildLoadQuery();
      const limit = normalizedDb === 'postgresql' || normalizedDb === 'mysql' || normalizedDb === 'mariadb' ? 500 : 200;
      const result = await onExecuteQuery(query, limit);
      if (result?.success && result.columns && result.rows) {
        const cols = result.columns.map((col: string) => ({
          field: col,
          headerName: col,
          editable: (params: any) => isEditable(col, params?.data),
          sortable: true,
          filter: true,
          resizable: true,
        }));
        setColumnDefs(cols);
        setRowData(result.rows);
      } else {
        setError(result?.error || 'Unable to load data');
        setRowData([]);
      }
    } catch (err) {
      console.error('Failed to load table data:', err);
      setError(err instanceof Error ? err.message : 'Unknown load error');
      setRowData([]);
    } finally {
      setLoading(false);
    }
  };

  const buildLoadQuery = () => {
    if (normalizedDb === 'mongodb') {
      return `db.${tableName}.find()`;
    }
    if (normalizedDb === 'redis') {
      return `KEYS ${tableName}`;
    }
    return `SELECT * FROM ${tableName}`;
  };

  const formatSqlValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    return String(value);
  };

  const formatMongoValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    // Attempt to preserve numbers/booleans if possible
    if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'string' && value.trim() === '') return '""';
    return JSON.stringify(value);
  };

  const normalizeMongoId = (raw: any): string | null => {
    if (!raw) return null;
    const rawStr = String(raw);
    const match = rawStr.match(/ObjectId\([\"']?([a-fA-F0-9]{24})[\"']?\)/);
    if (match?.[1]) return `ObjectId("${match[1]}")`;
    // Fallback to treating as string id
    return JSON.stringify(rawStr);
  };

  const isEditable = (field: string, row?: any) => {
    if (field.startsWith('_') && field !== '_id') return false;
    if (normalizedDb === 'mongodb') return field !== '_id';
    if (normalizedDb === 'redis') return field === 'value' && row?.type === 'string';
    return true;
  };

  const handleCellValueChanged = async (params: any) => {
    if (params.newValue === params.oldValue) return;
    if (!isEditable(params.colDef.field, params.data)) {
      params.node.setDataValue(params.colDef.field, params.oldValue);
      return;
    }

    try {
      setStatus('Saving change...');
      setError(null);

      if (normalizedDb === 'mongodb') {
        await updateMongoCell(params);
      } else if (normalizedDb === 'redis') {
        await updateRedisCell(params);
      } else {
        await updateSqlCell(params);
      }

      setStatus('Saved');
      // brief status reset
      setTimeout(() => setStatus(null), 1500);
    } catch (err) {
      params.node.setDataValue(params.colDef.field, params.oldValue);
      const message = err instanceof Error ? err.message : 'Update failed';
      setError(message);
      setStatus(null);
    }
  };

  const updateSqlCell = async (params: any) => {
    const pkField = primaryKeys?.[0] || columnDefs[0]?.field;
    if (!pkField) throw new Error('No primary key column available for update');

    const pkValue = params.data[pkField];
    if (pkValue === undefined) throw new Error('Row missing primary key value');

    const query = `UPDATE ${tableName} SET ${params.colDef.field} = ${formatSqlValue(params.newValue)} WHERE ${pkField} = ${formatSqlValue(pkValue)}`;
    await onExecuteQuery(query);
  };

  const updateMongoCell = async (params: any) => {
    const idValue = params.data._id;
    const normalizedId = normalizeMongoId(idValue);
    if (!normalizedId) throw new Error('Document is missing _id, cannot update');

    const setValue = formatMongoValue(params.newValue);
    const query = `db.${tableName}.updateOne({_id: ${normalizedId}}, {$set: {${params.colDef.field}: ${setValue}}})`;
    await onExecuteQuery(query);
  };

  const updateRedisCell = async (params: any) => {
    const { key, type } = params.data || {};
    if (!key) throw new Error('Missing key for Redis update');
    if (type !== 'string') throw new Error('Inline editing is only supported for string keys');

    const newValue = params.newValue === null || params.newValue === undefined ? '' : String(params.newValue);
    const query = `SET ${key} "${newValue.replace(/"/g, '\\"')}"`;
    await onExecuteQuery(query);
  };

  const exportCSV = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `${tableName}_export.csv`,
    });
  };

  const alertBar = useMemo(() => {
    if (error) {
      return (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      );
    }
    if (status) {
      return (
        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{status}</span>
        </div>
      );
    }
    return null;
  }, [error, status]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <div className="text-xs text-zinc-500">
          Double-click to edit, click away to auto-save{normalizedDb === 'redis' ? ' (string keys only)' : ''}.
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                gridRef.current?.api.setGridOption('quickFilterText', e.target.value);
              }}
              className="bg-transparent border-none outline-none text-sm text-zinc-300 w-32"
            />
          </div>

          <button
            onClick={exportCSV}
            className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-emerald-400 transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={loadTableData}
            disabled={loading}
            className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-violet-400 transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {alertBar}

      <div className="flex-1 ag-theme-quartz-dark">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            filter: true,
            sortable: true,
            resizable: true,
          }}
          rowSelection="multiple"
          suppressRowClickSelection
          enableCellTextSelection
          ensureDomOrder
          pagination
          paginationPageSize={100}
          paginationPageSizeSelector={[50, 100, 200, 500]}
          onCellValueChanged={handleCellValueChanged}
        />
      </div>
    </div>
  );
}
