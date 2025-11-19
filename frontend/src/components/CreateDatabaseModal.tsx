import { X, Loader2, User, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { DatabaseType } from '../types/database';

interface CreateDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (databaseType: string, instanceName: string, username: string, password: string) => void;
  databaseTypes: DatabaseType[];
  isCreating?: boolean;
  preselectedType?: string | null;
}

export default function CreateDatabaseModal({
  isOpen,
  onClose,
  onSubmit,
  databaseTypes,
  isCreating = false,
  preselectedType,
}: CreateDatabaseModalProps) {
  const [instanceName, setInstanceName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setInstanceName('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen || !preselectedType) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preselectedType && instanceName.trim() && username.trim() && password.trim()) {
      onSubmit(preselectedType, instanceName.trim(), username.trim(), password.trim());
    }
  };

  const selectedDbType = databaseTypes.find(t => t.name === preselectedType);
  const displayName = selectedDbType?.displayName || preselectedType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-5 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Create {displayName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Configure your new database instance</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 transition p-1.5 hover:bg-zinc-900 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Instance Name
            </label>
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="my-production-db"
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none transition"
              required
              autoFocus
            />
            <p className="text-[11px] text-zinc-500 mt-1">Choose a descriptive name for your instance</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />
              Database Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none transition"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">Username for accessing the database</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              <Lock className="w-3 h-3 inline mr-1" />
              Database Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a secure password"
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none transition"
              required
              minLength={8}
            />
            <p className="text-[11px] text-zinc-500 mt-1">Minimum 8 characters</p>
          </div>

          <div className="flex gap-2 pt-3 border-t border-zinc-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/25"
              disabled={!instanceName.trim() || !username.trim() || !password.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Database'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
