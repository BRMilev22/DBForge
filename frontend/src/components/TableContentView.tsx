import { useState, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Plus, Trash2, Save, X, Filter, Download, Upload, RefreshCw } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface TableContentViewProps {
  databaseId: number;
  tableName: string;
  onExecuteQuery: (query: string) => Promise<any>;
}

export default function TableContentView({ databaseId, tableName, onExecuteQuery }: TableContentViewProps) {
  const [rowData, setRowData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editedRows, setEditedRows] = useState<Set<number>>(new Set());
  const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
  const [newRows, setNewRows] = useState<any[]>([]);
  const [filterText, setFilterText] = useState('');
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    loadTableData();
  }, [tableName]);

  const loadTableData = async () => {
    setLoading(true);
    try {
      const result = await onExecuteQuery(`SELECT * FROM ${tableName} LIMIT 1000`);
      if (result.success && result.columns && result.rows) {
        // Create column definitions with editable cells
        const cols = result.columns.map((col: string) => ({
          field: col,
          headerName: col,
          editable: true,
          sortable: true,
          filter: true,
          resizable: true,
        }));
        setColumnDefs(cols);
        setRowData(result.rows.map((row: any, idx: number) => ({ ...row, _rowId: idx })));
      }
    } catch (err) {
      console.error('Failed to load table data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onCellValueChanged = (params: any) => {
    setEditedRows(new Set(editedRows).add(params.data._rowId));
  };

  const addNewRow = () => {
    const newRow: any = { _rowId: Date.now(), _isNew: true };
    columnDefs.forEach(col => {
      newRow[col.field] = null;
    });
    setNewRows([...newRows, newRow]);
    setRowData([...rowData, newRow]);
  };

  const deleteSelectedRows = () => {
    const selectedRows = gridRef.current?.api.getSelectedRows() || [];
    if (selectedRows.length === 0) {
      alert('Please select rows to delete');
      return;
    }
    
    if (!confirm(`Delete ${selectedRows.length} row(s)?`)) return;

    const deleted = new Set(deletedRows);
    selectedRows.forEach((row: any) => {
      if (!row._isNew) {
        deleted.add(row._rowId);
      }
    });
    
    setDeletedRows(deleted);
    setRowData(rowData.filter((row: any) => 
      !selectedRows.some((selected: any) => selected._rowId === row._rowId)
    ));
  };

  const saveChanges = async () => {
    setLoading(true);
    try {
      // Generate UPDATE queries for edited rows
      const updates: string[] = [];
      editedRows.forEach(rowId => {
        const row = rowData.find(r => r._rowId === rowId);
        if (row && !row._isNew) {
          const sets = Object.keys(row)
            .filter(key => !key.startsWith('_'))
            .map(key => `${key} = ${formatValue(row[key])}`)
            .join(', ');
          // Assume first column is primary key
          const pk = columnDefs[0]?.field;
          if (pk) {
            updates.push(`UPDATE ${tableName} SET ${sets} WHERE ${pk} = ${formatValue(row[pk])}`);
          }
        }
      });

      // Generate INSERT queries for new rows
      newRows.forEach(row => {
        const cols = Object.keys(row).filter(key => !key.startsWith('_'));
        const values = cols.map(col => formatValue(row[col])).join(', ');
        updates.push(`INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${values})`);
      });

      // Generate DELETE queries
      deletedRows.forEach(rowId => {
        const row = rowData.find(r => r._rowId === rowId);
        if (row) {
          const pk = columnDefs[0]?.field;
          if (pk) {
            updates.push(`DELETE FROM ${tableName} WHERE ${pk} = ${formatValue(row[pk])}`);
          }
        }
      });

      // Execute all queries
      for (const query of updates) {
        await onExecuteQuery(query);
      }

      // Clear state and reload
      setEditedRows(new Set());
      setNewRows([]);
      setDeletedRows(new Set());
      await loadTableData();
      
      alert('Changes saved successfully!');
    } catch (err) {
      alert('Failed to save changes: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    return String(value);
  };

  const discardChanges = () => {
    if (!confirm('Discard all unsaved changes?')) return;
    setEditedRows(new Set());
    setNewRows([]);
    setDeletedRows(new Set());
    loadTableData();
  };

  const exportCSV = () => {
    gridRef.current?.api.exportDataAsCsv({
      fileName: `${tableName}_export.csv`
    });
  };

  const hasChanges = editedRows.size > 0 || newRows.length > 0 || deletedRows.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <button
            onClick={addNewRow}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
          
          <button
            onClick={deleteSelectedRows}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          {hasChanges && (
            <>
              <div className="h-4 w-px bg-zinc-700" />
              <button
                onClick={saveChanges}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
              
              <button
                onClick={discardChanges}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm transition"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
            </>
          )}
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

      {/* Status Bar */}
      {hasChanges && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm text-amber-400">
          {editedRows.size > 0 && <span>{editedRows.size} edited, </span>}
          {newRows.length > 0 && <span>{newRows.length} new, </span>}
          {deletedRows.size > 0 && <span>{deletedRows.size} deleted</span>}
          <span className="ml-2">- Unsaved changes</span>
        </div>
      )}

      {/* Data Grid */}
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
          onCellValueChanged={onCellValueChanged}
          suppressRowClickSelection
          enableCellTextSelection
          ensureDomOrder
          pagination
          paginationPageSize={100}
          paginationPageSizeSelector={[50, 100, 200, 500]}
        />
      </div>
    </div>
  );
}
