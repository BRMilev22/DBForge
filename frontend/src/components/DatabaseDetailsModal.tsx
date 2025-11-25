import { X, Database, Play, Square, Trash2, Copy, Check, Server, Key, User, Link, Calendar, Activity, HardDrive, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { DatabaseInstance } from '../types/database';

interface DatabaseDetailsModalProps {
  database: DatabaseInstance;
  isOpen: boolean;
  onClose: () => void;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function DatabaseDetailsModal({
  database,
  isOpen,
  onClose,
  onStart,
  onStop,
  onDelete,
}: DatabaseDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Use the instance-specific API token provided by the backend (database.apiToken)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-emerald-500';
      case 'STOPPED': return 'bg-zinc-500';
      case 'CREATING': return 'bg-sky-500';
      case 'FAILED': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'text-emerald-400';
      case 'STOPPED': return 'text-zinc-400';
      case 'CREATING': return 'text-sky-400';
      case 'FAILED': return 'text-rose-400';
      default: return 'text-zinc-400';
    }
  };

  const connectionString = `${database.databaseType.toLowerCase()}://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Database className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">{database.instanceName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{database.databaseType}</span>
                <span className="text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(database.status)}`} />
                  <span className={`text-xs font-medium ${getStatusText(database.status)}`}>
                    {database.status}
                  </span>
                </div>
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {database.status === 'STOPPED' ? (
              <button
                onClick={() => onStart(database.id)}
                className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
              >
                <Play className="w-4 h-4" />
                Start Instance
              </button>
            ) : database.status === 'RUNNING' ? (
              <button
                onClick={() => onStop(database.id)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop Instance
              </button>
            ) : null}
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm font-medium transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDelete(database.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Connection Information */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-zinc-400" />
              Connection Details
            </h3>
            
            <div className="space-y-2.5">
              {/* Host */}
              <div className="group">
                <label className="text-[11px] text-zinc-500 mb-1 block">Host</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
                    {database.connectionInfo.host}
                  </code>
                  <button
                    onClick={() => copyToClipboard(database.connectionInfo.host, 'host')}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                  >
                    {copiedField === 'host' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Port */}
              <div className="group">
                <label className="text-[11px] text-zinc-500 mb-1 block">Port</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
                    {database.connectionInfo.port}
                  </code>
                  <button
                    onClick={() => copyToClipboard(database.connectionInfo.port.toString(), 'port')}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                  >
                    {copiedField === 'port' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Database Name */}
              <div className="group">
                <label className="text-[11px] text-zinc-500 mb-1 block">Database Name</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
                    {database.connectionInfo.database}
                  </code>
                  <button
                    onClick={() => copyToClipboard(database.connectionInfo.database, 'database')}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                  >
                    {copiedField === 'database' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-zinc-400" />
              Credentials
            </h3>
            
            <div className="space-y-2.5">
              {/* Username */}
              <div className="group">
                <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Username
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
                    {database.connectionInfo.username}
                  </code>
                  <button
                    onClick={() => copyToClipboard(database.connectionInfo.username, 'username')}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                  >
                    {copiedField === 'username' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="group">
                <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs">
                    {database.connectionInfo.password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(database.connectionInfo.password, 'password')}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Connection String */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <Link className="w-4 h-4 text-zinc-400" />
              Connection String
            </h3>
            
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs break-all">
                {connectionString}
              </code>
              <button
                onClick={() => copyToClipboard(connectionString, 'connection')}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
              >
                {copiedField === 'connection' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Instance Information */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-400" />
              Instance Information
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Instance ID
                </label>
                <div className="text-xs text-zinc-200 font-mono">{database.id}</div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Container ID
                </label>
                <div className="text-xs text-zinc-200 font-mono truncate" title={database.containerId}>
                  {database.containerId?.substring(0, 12) || 'N/A'}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created
                </label>
                <div className="text-xs text-zinc-200">
                  {new Date(database.createdAt).toLocaleString()}
                </div>
              </div>

              {database.startedAt && (
                <div>
                  <label className="text-[11px] text-zinc-500 mb-1 block flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Last Started
                  </label>
                  <div className="text-xs text-zinc-200">
                    {new Date(database.startedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Connect Guide */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold text-zinc-300 mb-3">Quick Connect</h3>
            <div className="space-y-3 text-xs text-zinc-400">
              <div>
                <p className="mb-2 text-zinc-500">Open in database client:</p>
                <div className="flex flex-wrap gap-2">
                  {/* PostgreSQL Clients */}
                  {database.databaseType === 'postgresql' && (
                    <>
                      <a
                        href={`postgresql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in Postico (macOS)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Postico
                      </a>
                      <a
                        href={`postgresql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in TablePlus"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TablePlus
                      </a>
                      <a
                        href={`postgres://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in DataGrip or other clients"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Other
                      </a>
                    </>
                  )}

                  {/* MySQL Clients */}
                  {database.databaseType === 'mysql' && (
                    <>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in Sequel Ace (macOS)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Sequel Ace
                      </a>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in TablePlus"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TablePlus
                      </a>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in MySQL Workbench, DBeaver, or other clients"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Other
                      </a>
                    </>
                  )}

                  {/* MariaDB Clients (uses MySQL protocol) */}
                  {database.databaseType === 'mariadb' && (
                    <>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in TablePlus"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TablePlus
                      </a>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in HeidiSQL (Windows)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        HeidiSQL
                      </a>
                      <a
                        href={`mysql://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in DBeaver or other MySQL-compatible clients"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Other
                      </a>
                    </>
                  )}

                  {/* MongoDB Clients */}
                  {database.databaseType === 'mongodb' && (
                    <>
                      <a
                        href={`mongodb-compass://connect?connectionString=${encodeURIComponent(`mongodb://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`)}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in MongoDB Compass"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Compass
                      </a>
                      <a
                        href={`mongodb://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in TablePlus"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TablePlus
                      </a>
                      <a
                        href={`mongodb://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}`}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in Studio 3T, Robo 3T, or other clients"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Other
                      </a>
                    </>
                  )}

                  {/* Redis Clients */}
                  {database.databaseType === 'redis' && (
                    <>
                      <a
                        href={`redis://default:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in RedisInsight"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        RedisInsight
                      </a>
                      <a
                        href={`redis://default:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}`}
                        className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in TablePlus"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        TablePlus
                      </a>
                      <a
                        href={`redis://default:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}`}
                        className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-xs transition flex items-center gap-2"
                        title="Open in Another Redis Desktop Manager or other clients"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Other
                      </a>
                    </>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">
                  Click a button to open the connection in your installed client. If nothing happens, install the client first.
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <p className="mb-2 text-zinc-500">Or use CLI:</p>
                <code className="block px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                  {database.databaseType === 'postgresql' && `psql -h ${database.connectionInfo.host} -p ${database.connectionInfo.port} -U ${database.connectionInfo.username} -d ${database.connectionInfo.database}`}
                  {database.databaseType === 'mysql' && `mysql -h ${database.connectionInfo.host} -P ${database.connectionInfo.port} -u ${database.connectionInfo.username} -p${database.connectionInfo.password} ${database.connectionInfo.database}`}
                  {database.databaseType === 'mariadb' && `mariadb -h ${database.connectionInfo.host} -P ${database.connectionInfo.port} -u ${database.connectionInfo.username} -p${database.connectionInfo.password} ${database.connectionInfo.database}`}
                  {database.databaseType === 'mongodb' && `mongosh "mongodb://${database.connectionInfo.username}:${database.connectionInfo.password}@${database.connectionInfo.host}:${database.connectionInfo.port}/${database.connectionInfo.database}"`}
                  {database.databaseType === 'redis' && `redis-cli -h ${database.connectionInfo.host} -p ${database.connectionInfo.port} -a ${database.connectionInfo.password}`}
                </code>
              </div>
              {/* API Token display for Quick Connect */}
              <div className="mt-3 flex items-start gap-2">
                <div className="flex-1">
                  <label className="text-[11px] text-zinc-500 mb-1 block">API Token (used for API requests)</label>
                  <div className="flex items-center gap-2">
                    {
                      database.apiToken ? (
                        <code
                          title={database.apiToken}
                          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] break-all"
                        >
                          {database.apiToken}
                        </code>
                      ) : (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px] truncate">
                              No API token available for this database.
                            </code>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const token = await (await import('../services/api')).databaseApi.generateApiToken(database.id);
                                  // update the local object so UI shows it without refetch
                                  (database as any).apiToken = token;
                                  copyToClipboard(token, 'api-token');
                                } catch (err) {
                                  console.error('Failed to generate API token:', err);
                                }
                              }}
                              className="px-3 py-1 rounded bg-violet-500 text-white text-xs hover:bg-violet-400 transition"
                            >
                              Generate
                            </button>
                          </div>
                        )
                      }
                      <button
                        onClick={() => database.apiToken && copyToClipboard(database.apiToken as string, 'api-token')}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition"
                      title="Copy API token"
                    >
                      {copiedField === 'api-token' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
