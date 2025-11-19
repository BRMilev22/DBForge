import { Database, Server, HardDrive, Zap, Users, Clock } from 'lucide-react';
import type { DatabaseInstance } from '../types/database';

interface ConnectionInfoProps {
  database: DatabaseInstance;
  schema: { databaseName: string; tables: any[] } | null;
}

export default function ConnectionInfo({ database, schema }: ConnectionInfoProps) {
  return (
    <div className="p-4 bg-zinc-950/50 border-b border-zinc-800">
      <div className="flex items-start gap-4">
        {/* Database Icon */}
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <Database className="w-6 h-6 text-violet-400" />
        </div>

        {/* Info Grid */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-zinc-600 mb-1">Database</div>
            <div className="text-sm font-medium text-zinc-300">{database.instanceName}</div>
          </div>
          
          <div>
            <div className="text-xs text-zinc-600 mb-1">Type</div>
            <div className="text-sm font-medium text-zinc-300 capitalize">{database.type}</div>
          </div>
          
          <div>
            <div className="text-xs text-zinc-600 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                database.status === 'RUNNING' ? 'bg-emerald-400' : 'bg-zinc-600'
              }`} />
              <span className="text-sm font-medium text-zinc-300">{database.status}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-600 mb-1 flex items-center gap-1">
              <Server className="w-3 h-3" />
              Host
            </div>
            <div className="text-sm font-mono text-zinc-400">
              {database.host}:{database.port}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-600 mb-1 flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              Schema
            </div>
            <div className="text-sm font-mono text-zinc-400">
              {schema?.databaseName || database.databaseName}
            </div>
          </div>

          <div>
            <div className="text-xs text-zinc-600 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Tables
            </div>
            <div className="text-sm font-medium text-zinc-300">
              {schema?.tables.length || 0}
            </div>
          </div>
        </div>

        {/* Resource Limits */}
        <div className="flex-shrink-0">
          <div className="text-xs text-zinc-600 mb-2">Resource Limits</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-500">CPU:</span>
              <span className="text-zinc-400 font-mono">{database.cpuLimit || '0.5'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <HardDrive className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-500">Memory:</span>
              <span className="text-zinc-400 font-mono">{database.memoryLimit || '512m'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-500">Max Connections:</span>
              <span className="text-zinc-400 font-mono">{database.maxConnections || '20'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
