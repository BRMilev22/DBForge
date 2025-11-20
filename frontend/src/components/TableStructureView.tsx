import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Key, Link as LinkIcon, Zap } from 'lucide-react';

interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  autoIncrement: boolean;
  maxLength: number;
}

interface Index {
  name: string;
  type: string;
  columns: string[];
}

interface ForeignKey {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

interface TableStructureViewProps {
  databaseId: number;
  tableName: string;
  schema: any;
  onExecuteQuery: (query: string) => Promise<any>;
}

export default function TableStructureView({ 
  databaseId: _databaseId, 
  tableName, 
  schema, 
  onExecuteQuery: _onExecuteQuery 
}: TableStructureViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes' | 'foreign-keys'>('columns');
  const [columns, setColumns] = useState<Column[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [_foreignKeys, _setForeignKeys] = useState<ForeignKey[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStructure();
  }, [tableName, schema]);

  const loadStructure = () => {
    const table = schema?.tables.find((t: any) => t.name === tableName);
    if (table) {
      setColumns(table.columns || []);
      setIndexes(table.indexes || []);
      _setForeignKeys([]);  // Would need backend support
    }
  };

  const addColumn = () => {
    setColumns([...columns, {
      name: `new_column_${columns.length + 1}`,
      dataType: 'VARCHAR',
      nullable: true,
      defaultValue: null,
      primaryKey: false,
      autoIncrement: false,
      maxLength: 255
    }]);
  };

  const deleteColumn = (index: number) => {
    if (!confirm(`Delete column "${columns[index].name}"?`)) return;
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const saveStructure = async () => {
    setLoading(true);
    try {
      // Generate ALTER TABLE statements
      // This is simplified - real implementation would need to track changes
      // and generate appropriate ADD COLUMN, MODIFY COLUMN, DROP COLUMN statements
      
      alert('Structure changes saved! (Full ALTER TABLE generation not yet implemented)');
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950/30">
        <button
          onClick={() => setActiveTab('columns')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'columns'
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Columns
        </button>
        <button
          onClick={() => setActiveTab('indexes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'indexes'
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Indexes
        </button>
        <button
          onClick={() => setActiveTab('foreign-keys')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
            activeTab === 'foreign-keys'
              ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Foreign Keys
        </button>

        <div className="flex-1" />
        
        <button
          onClick={saveStructure}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Save Changes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'columns' && (
          <div>
            <div className="mb-4">
              <button
                onClick={addColumn}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Column
              </button>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Name</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Type</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Length</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Nullable</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Default</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">PK</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">AI</th>
                    <th className="px-4 py-2 text-left text-zinc-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, index) => (
                    <tr key={index} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateColumn(index, 'name', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={col.dataType}
                          onChange={(e) => updateColumn(index, 'dataType', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-sm"
                        >
                          <option value="INT">INT</option>
                          <option value="BIGINT">BIGINT</option>
                          <option value="VARCHAR">VARCHAR</option>
                          <option value="TEXT">TEXT</option>
                          <option value="DATE">DATE</option>
                          <option value="DATETIME">DATETIME</option>
                          <option value="TIMESTAMP">TIMESTAMP</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DECIMAL">DECIMAL</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={col.maxLength}
                          onChange={(e) => updateColumn(index, 'maxLength', parseInt(e.target.value))}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-sm w-20"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={col.nullable}
                          onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={col.defaultValue || ''}
                          onChange={(e) => updateColumn(index, 'defaultValue', e.target.value || null)}
                          placeholder="NULL"
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={col.primaryKey}
                          onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={col.autoIncrement}
                          onChange={(e) => updateColumn(index, 'autoIncrement', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => deleteColumn(index)}
                          className="p-1 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'indexes' && (
          <div>
            <div className="text-zinc-400 text-sm">
              {indexes.length} index(es)
              {indexes.map((idx, i) => (
                <div key={i} className="mt-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                  <div className="font-medium text-zinc-300">{idx.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {idx.type} on {idx.columns.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'foreign-keys' && (
          <div className="text-zinc-400 text-sm">
            Foreign key management coming soon...
          </div>
        )}
      </div>
    </div>
  );
}
