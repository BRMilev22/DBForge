import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Table, Columns, Key, Database as DatabaseIcon, Loader2, RefreshCw, 
         Plus, Trash2, Edit, FileText, Copy } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface SchemaExplorerProps {
  schema: SchemaInfo | null;
  isLoading: boolean;
  databaseType?: string;
  onTableSelect?: (tableName: string) => void;
  onTableStructure?: (tableName: string) => void;
  onRefresh?: () => void;
  onQueryGenerate?: (query: string) => void;
  onQueryExecute?: (query: string) => void;
}

interface SchemaInfo {
  databaseName: string;
  tables: TableInfo[];
}

interface TableInfo {
  name: string;
  type: string;
  rowCount: number | null;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
  autoIncrement: boolean;
  maxLength: number;
}

interface IndexInfo {
  name: string;
  type: string;
  columns: string[];
}

function getExampleQuery(databaseType?: string): string {
  const dbType = databaseType?.toLowerCase() || 'mysql';
  
  if (dbType === 'postgresql') {
    return `CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100)\n);`;
  } else if (dbType === 'mysql' || dbType === 'mariadb') {
    return `CREATE TABLE users (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  name VARCHAR(100)\n);`;
  } else if (dbType === 'mongodb') {
    return `// Welcome to DBForge MongoDB Query Editor!\n// Create your first document:\n\ndb.users.insertOne({\n  name: "John Doe",\n  email: "john@example.com",\n  created_at: new Date()\n});\n\n// Query your data:\n// db.users.find({});`;
  } else if (dbType === 'redis') {
    return `# Welcome to DBForge Redis Query Editor!\n# Set a key-value pair:\n\nSET user:1:name "John Doe"\nSET user:1:email "john@example.com"\n\n# Get a value:\n# GET user:1:name\n\n# List all keys:\n# KEYS *`;
  }
  
  return `CREATE TABLE users (\n  id INT PRIMARY KEY,\n  name VARCHAR(100)\n);`;
}

export default function SchemaExplorer({ schema, isLoading, databaseType, onTableSelect, onTableStructure, onRefresh, onQueryGenerate, onQueryExecute }: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; table: TableInfo } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; action: () => void; variant: 'danger' | 'warning' } | null>(null);

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleContextMenu = (e: React.MouseEvent, table: TableInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, table });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleGenerateSelect = () => {
    if (contextMenu) {
      if (databaseType === 'mongodb') {
        onQueryGenerate?.(`db.${contextMenu.table.name}.find({})`);
      } else if (databaseType === 'redis') {
        // For Redis, table name is a key pattern like "user:*"
        onQueryGenerate?.(`KEYS ${contextMenu.table.name}`);
      } else {
        const columns = contextMenu.table.columns.map(c => c.name).join(', ');
        onQueryGenerate?.(`SELECT ${columns}\nFROM ${contextMenu.table.name};`);
      }
      setContextMenu(null);
    }
  };

  const handleGenerateInsert = () => {
    if (contextMenu) {
      if (databaseType === 'mongodb') {
        // Generate MongoDB insertOne with sample fields
        const fields = contextMenu.table.columns
          .filter(c => c.name !== '_id') // Skip _id as it's auto-generated
          .map(c => {
            const type = c.dataType.toLowerCase();
            if (type.includes('string') || type === 'objectid') {
              return `${c.name}: "?"`;
            } else if (type.includes('int') || type.includes('double') || type.includes('long')) {
              return `${c.name}: ?`;
            } else if (type.includes('boolean')) {
              return `${c.name}: true`;
            } else if (type.includes('date')) {
              return `${c.name}: new Date()`;
            }
            return `${c.name}: "?"`;
          }).join(', ');
        onQueryGenerate?.(`db.${contextMenu.table.name}.insertOne({${fields}})`);
      } else if (databaseType === 'redis') {
        // For Redis, generate a SET command
        // Extract the prefix from pattern (e.g., "user:*" -> "user:")
        const prefix = contextMenu.table.name.replace('*', '');
        onQueryGenerate?.(`SET ${prefix}? "value"`);
      } else {
        const columns = contextMenu.table.columns.map(c => c.name).join(', ');
        // Generate appropriate placeholders based on column type
        const values = contextMenu.table.columns.map(c => {
          const type = c.dataType.toLowerCase();
          const name = c.name.toLowerCase();
          
          // For timestamp/date columns, use NOW() or CURRENT_TIMESTAMP
          if (type.includes('timestamp') || type.includes('datetime') || 
              (type.includes('date') && !type.includes('update')) ||
              name.includes('created_at') || name.includes('updated_at') || 
              name.includes('createdat') || name.includes('updatedat')) {
            return 'NOW()';
          }
          
          // For numeric types, use unquoted placeholder
          if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || 
              type.includes('float') || type.includes('double') || type.includes('real') ||
              type.includes('serial') || type.includes('bigserial') || type.includes('smallserial')) {
            return '?';
          }
          
          // For all other types (text, varchar, etc.), use quoted placeholder
          return "'?'";
        }).join(', ');
        onQueryGenerate?.(`INSERT INTO ${contextMenu.table.name} (${columns})\nVALUES (${values});`);
      }
      setContextMenu(null);
    }
  };

  const handleGenerateUpdate = () => {
    if (contextMenu) {
      if (databaseType === 'mongodb') {
        // Generate MongoDB updateOne
        const updateFields = contextMenu.table.columns
          .filter(c => c.name !== '_id')
          .map(c => {
            const type = c.dataType.toLowerCase();
            if (type.includes('string') || type === 'objectid') {
              return `${c.name}: "?"`;
            } else if (type.includes('int') || type.includes('double') || type.includes('long')) {
              return `${c.name}: ?`;
            }
            return `${c.name}: "?"`;
          }).join(', ');
        onQueryGenerate?.(`db.${contextMenu.table.name}.updateOne({_id: ObjectId("?")}, {$set: {${updateFields}}})`);
      } else if (databaseType === 'redis') {
        // For Redis, generate a SET command (update is same as insert)
        const prefix = contextMenu.table.name.replace('*', '');
        onQueryGenerate?.(`SET ${prefix}? "new_value"`);
      } else {
        const sets = contextMenu.table.columns.filter(c => !c.primaryKey).map(c => {
          const type = c.dataType.toLowerCase();
          const name = c.name.toLowerCase();
          
          // For timestamp/date columns, use NOW()
          if (type.includes('timestamp') || type.includes('datetime') || 
              (type.includes('date') && !type.includes('update')) ||
              name.includes('updated_at') || name.includes('updatedat') || 
              name.includes('modified_at') || name.includes('modifiedat')) {
            return `${c.name} = NOW()`;
          }
          
          // For numeric types, use unquoted placeholder
          if (type.includes('int') || type.includes('numeric') || type.includes('decimal') || 
              type.includes('float') || type.includes('double') || type.includes('real') ||
              type.includes('serial') || type.includes('bigserial') || type.includes('smallserial')) {
            return `${c.name} = ?`;
          }
          
          // For all other types (text, varchar, etc.), use quoted placeholder
          return `${c.name} = '?'`;
        }).join(',\n  ');
        
        const pkCol = contextMenu.table.columns.find(c => c.primaryKey)?.name || 'id';
        const pkType = contextMenu.table.columns.find(c => c.primaryKey)?.dataType.toLowerCase() || '';
        const pkValue = pkType.includes('int') || pkType.includes('numeric') || pkType.includes('serial') ? '?' : "'?'";
        
        onQueryGenerate?.(`UPDATE ${contextMenu.table.name}\nSET\n  ${sets}\nWHERE ${pkCol} = ${pkValue};`);
      }
      setContextMenu(null);
    }
  };

  const handleGenerateDelete = () => {
    if (contextMenu) {
      if (databaseType === 'mongodb') {
        onQueryGenerate?.(`db.${contextMenu.table.name}.deleteOne({_id: ObjectId("?")})`);
      } else if (databaseType === 'redis') {
        // For Redis, generate a DEL command
        const prefix = contextMenu.table.name.replace('*', '');
        onQueryGenerate?.(`DEL ${prefix}?`);
      } else {
        const pkCol = contextMenu.table.columns.find(c => c.primaryKey)?.name || 'id';
        onQueryGenerate?.(`DELETE FROM ${contextMenu.table.name}\nWHERE ${pkCol} = ?;`);
      }
      setContextMenu(null);
    }
  };

  const handleTruncateTable = () => {
    if (contextMenu) {
      const tableName = contextMenu.table.name;
      if (databaseType === 'mongodb') {
        setConfirmDialog({
          title: 'Delete All Documents',
          message: `Are you sure you want to delete all documents from collection "${tableName}"? This will keep the collection structure.`,
          variant: 'warning',
          action: () => {
            onQueryExecute?.(`db.${tableName}.deleteMany({})`);
            setConfirmDialog(null);
          }
        });
      } else if (databaseType === 'redis') {
        setConfirmDialog({
          title: 'Delete All Keys',
          message: `Are you sure you want to delete all keys matching pattern "${tableName}"? This action cannot be undone.`,
          variant: 'warning',
          action: () => {
            // Redis doesn't have a direct delete by pattern, user needs to manually delete
            onQueryGenerate?.(`# Delete all keys matching ${tableName}\n# You'll need to delete them individually or use:\n# redis-cli --scan --pattern "${tableName}" | xargs redis-cli DEL`);
            setConfirmDialog(null);
          }
        });
      } else {
        setConfirmDialog({
          title: 'Truncate Table',
          message: `Are you sure you want to truncate table "${tableName}"? This will delete all rows but keep the table structure.`,
          variant: 'warning',
          action: () => {
            onQueryExecute?.(`TRUNCATE TABLE ${tableName};`);
            setConfirmDialog(null);
          }
        });
      }
      setContextMenu(null);
    }
  };

  const handleDropTable = () => {
    if (contextMenu) {
      const tableName = contextMenu.table.name;
      if (databaseType === 'mongodb') {
        setConfirmDialog({
          title: 'Drop Collection',
          message: `Are you sure you want to DROP collection "${tableName}"? This action cannot be undone and will permanently delete the collection and all its documents.`,
          variant: 'danger',
          action: () => {
            onQueryExecute?.(`db.${tableName}.drop()`);
            setConfirmDialog(null);
          }
        });
      } else if (databaseType === 'redis') {
        // Redis doesn't have collections/tables to drop - just show info
        setConfirmDialog({
          title: 'Delete Keys',
          message: `Redis doesn't have a "drop" concept. Would you like to see how to delete all keys matching "${tableName}"?`,
          variant: 'warning',
          action: () => {
            onQueryGenerate?.(`# Redis doesn't support DROP\n# To delete all keys matching ${tableName}:\n# Use KEYS ${tableName} then DEL each key`);
            setConfirmDialog(null);
          }
        });
      } else {
        setConfirmDialog({
          title: 'Drop Table',
          message: `Are you sure you want to DROP table "${tableName}"? This action cannot be undone and will permanently delete the table and all its data.`,
          variant: 'danger',
          action: () => {
            onQueryExecute?.(`DROP TABLE ${tableName};`);
            setConfirmDialog(null);
          }
        });
      }
      setContextMenu(null);
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => handleCloseContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-zinc-500 text-sm px-4">
          <DatabaseIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No schema loaded</p>
        </div>
      </div>
    );
  }

  if (schema.tables.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4 text-violet-400" />
            <div>
              <div className="text-sm font-medium text-zinc-300">{schema.databaseName}</div>
              <div className="text-xs text-zinc-600">0 tables</div>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-xs">
            <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Table className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 mb-2">No tables yet</p>
            <p className="text-xs text-zinc-600">
              Create your first table by running:
            </p>
            <div className="mt-3 p-2 rounded bg-zinc-900/50 border border-zinc-800 text-left">
              <code className="text-xs text-emerald-400 font-mono" style={{ whiteSpace: 'pre-wrap' }}>
                {getExampleQuery(databaseType)}
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/30">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="w-4 h-4 text-violet-400" />
          <div>
            <div className="text-sm font-medium text-zinc-300">{schema.databaseName}</div>
            <div className="text-xs text-zinc-600">{schema.tables.length} tables</div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-zinc-900/50 text-zinc-500 hover:text-violet-400 transition disabled:opacity-50"
          title="Refresh Schema"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto">
        {schema.tables.map((table) => (
          <div key={table.name} className="border-b border-zinc-800/30">
            {/* Table Header */}
            <div 
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-zinc-900/50 transition text-left group"
              onContextMenu={(e) => handleContextMenu(e, table)}
            >
              <button
                onClick={() => toggleTable(table.name)}
                className="flex-1 flex items-center gap-2"
              >
                {expandedTables.has(table.name) ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-300 group-hover:text-violet-400 transition">
                    {table.name}
                  </div>
                  {table.rowCount !== null && (
                    <div className="text-xs text-zinc-600">
                      {table.rowCount.toLocaleString()} rows
                    </div>
                  )}
                </div>
                {table.type === 'VIEW' && (
                  <div className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    VIEW
                  </div>
                )}
              </button>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => onTableSelect?.(table.name)}
                  className="p-1 rounded hover:bg-violet-500/20 text-zinc-500 hover:text-violet-400 transition"
                  title="Browse Data"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onTableStructure?.(table.name)}
                  className="p-1 rounded hover:bg-violet-500/20 text-zinc-500 hover:text-violet-400 transition"
                  title="Table Structure"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Columns (when expanded) */}
            {expandedTables.has(table.name) && (
              <div className="bg-zinc-950/50">
                {/* Columns Header */}
                <div className="px-4 py-2 flex items-center gap-2 bg-zinc-900/30">
                  <Columns className="w-3 h-3 text-zinc-500" />
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Columns ({table.columns.length})
                  </div>
                </div>

                {/* Columns List */}
                {table.columns.map((column) => (
                  <div
                    key={column.name}
                    className="px-4 py-2 pl-10 hover:bg-zinc-900/30 transition group"
                  >
                    <div className="flex items-center gap-2">
                      {column.primaryKey && (
                        <Key className="w-3 h-3 text-amber-400" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-300">
                            {column.name}
                          </span>
                          {column.autoIncrement && (
                            <span className="text-xs px-1 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/30">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5">
                          {column.dataType}
                          {column.maxLength > 0 && `(${column.maxLength})`}
                          {!column.nullable && ' • NOT NULL'}
                          {column.defaultValue && ` • DEFAULT ${column.defaultValue}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Indexes */}
                {table.indexes.length > 0 && (
                  <>
                    <div className="px-4 py-2 flex items-center gap-2 bg-zinc-900/30 border-t border-zinc-800/30">
                      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                        Indexes ({table.indexes.length})
                      </div>
                    </div>
                    {table.indexes.map((index) => (
                      <div
                        key={index.name}
                        className="px-4 py-2 pl-10 hover:bg-zinc-900/30 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-zinc-400">
                            {index.name}
                          </div>
                          <div className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                            {index.type}
                          </div>
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5">
                          {index.columns.join(', ')}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => onTableSelect?.(contextMenu.table.name)}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            Browse Data
          </button>
          <button
            onClick={() => onTableStructure?.(contextMenu.table.name)}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Columns className="w-3.5 h-3.5 text-sky-400" />
            {databaseType === 'mongodb' ? 'Collection Structure' : 'Table Structure'}
          </button>
          
          <div className="my-1 border-t border-zinc-800/50"></div>
          
          <div className="px-2 py-1 text-xs text-zinc-600 uppercase tracking-wide">
            {databaseType === 'mongodb' ? 'Generate MongoDB Query' : databaseType === 'redis' ? 'Generate Redis Command' : 'Generate SQL'}
          </div>
          
          <button
            onClick={handleGenerateSelect}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            {databaseType === 'mongodb' ? 'FIND Query' : 'SELECT Statement'}
          </button>
          <button
            onClick={handleGenerateInsert}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            {databaseType === 'mongodb' ? 'INSERT Document' : 'INSERT Statement'}
          </button>
          <button
            onClick={handleGenerateUpdate}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Edit className="w-3.5 h-3.5 text-amber-400" />
            {databaseType === 'mongodb' ? 'UPDATE Document' : 'UPDATE Statement'}
          </button>
          <button
            onClick={handleGenerateDelete}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            {databaseType === 'mongodb' ? 'DELETE Document' : 'DELETE Statement'}
          </button>
          
          <div className="my-1 border-t border-zinc-800/50"></div>
          
          <button
            onClick={handleTruncateTable}
            className="w-full px-3 py-2 text-left text-sm text-amber-400 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            {databaseType === 'mongodb' ? 'Delete All Documents' : 'Truncate Table'}
          </button>
          <button
            onClick={handleDropTable}
            className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-zinc-800 transition flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {databaseType === 'mongodb' ? 'Drop Collection' : 'Drop Table'}
          </button>
        </div>
      )}
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        variant={confirmDialog?.variant || 'warning'}
        confirmLabel={confirmDialog?.variant === 'danger' ? 'Drop Table' : 'Truncate'}
        cancelLabel="Cancel"
        onConfirm={() => {
          confirmDialog?.action();
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
