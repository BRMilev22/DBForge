import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Database, RefreshCw, AlertCircle, Play, Square, Trash2, Copy, Check, Activity, Zap, HardDrive, Clock, Settings, BarChart3, FileText, Download, Code } from 'lucide-react';
import { databaseApi, analyticsApi, type AnalyticsResponse } from './services/api';
import CreateDatabaseModal from './components/CreateDatabaseModal';
import DatabaseSelector from './components/DatabaseSelector';
import DatabaseDetailsModal from './components/DatabaseDetailsModal';
import DatabaseWorkbench from './components/DatabaseWorkbench';
import AuthModal from './components/AuthModal';
import Landing from './components/Landing';
import DatabaseTypeChart from './components/DatabaseTypeChart';
import DatabaseStatusChart from './components/DatabaseStatusChart';
import { useAuth } from './contexts/AuthContext';
import type { DatabaseInstance, DatabaseType } from './types/database';

function App() {
  const { user, logout } = useAuth();
  const [databases, setDatabases] = useState<DatabaseInstance[]>([]);
  const [databaseTypes, setDatabaseTypes] = useState<DatabaseType[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDatabaseSelector, setShowDatabaseSelector] = useState(false);
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'databases' | 'activity'>('overview');
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInstance | null>(null);
  const [workbenchDatabase, setWorkbenchDatabase] = useState<DatabaseInstance | null>(null);
  const [dbFilter, setDbFilter] = useState<string>('all');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  

  const loadDatabases = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const [dbData, analyticsData] = await Promise.all([
        databaseApi.getDatabases(),
        analyticsApi.getAnalytics()
      ]);
      setDatabases(dbData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError('Failed to load databases. Please check your connection.');
      console.error('Error loading databases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh overview data (analytics + database statuses) without resetting other UI state
  const loadDatabaseTypes = async () => {
    try {
      const types = await databaseApi.getTypes();
      setDatabaseTypes(types);
    } catch (err) {
      console.error('Error loading database types:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDatabases();
      loadDatabaseTypes();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateDatabase = async (databaseType: string, instanceName: string, username: string, password: string) => {
    setIsCreating(true);
    try {
      await databaseApi.createDatabase({ databaseType, instanceName, dbUsername: username, dbPassword: password });
      setIsModalOpen(false);
      setSelectedDatabaseType(null);
      showToast('Database created and starting...', 'success');
      // Wait a bit for Docker to start the container
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadDatabases();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create database. Please try again.';
      showToast(errorMsg, 'error');
      console.error('Error creating database:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartDatabase = async (id: number) => {
    try {
      await databaseApi.startDatabase(id);
      showToast('Database started successfully!', 'success');
      await loadDatabases();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start database.';
      showToast(errorMsg, 'error');
      console.error('Error starting database:', err);
    }
  };

  const handleStopDatabase = async (id: number) => {
    try {
      await databaseApi.stopDatabase(id);
      showToast('Database stopped successfully!', 'success');
      await loadDatabases();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop database.';
      showToast(errorMsg, 'error');
      console.error('Error stopping database:', err);
    }
  };

  const handleDeleteDatabase = async (id: number) => {
    if (!confirm('Are you sure you want to delete this database? This action cannot be undone.')) {
      return;
    }
    
    try {
      await databaseApi.deleteDatabase(id);
      showToast('Database deleted successfully!', 'success');
      await loadDatabases();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete database.';
      showToast(errorMsg, 'error');
      console.error('Error deleting database:', err);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.3)]';
      case 'STOPPED': return 'bg-zinc-500';
      case 'CREATING': return 'bg-amber-500 animate-pulse shadow-[0_0_8px_2px_rgba(245,158,11,0.3)]';
      default: return 'bg-sky-500';
    }
  };

  const getDatabaseIcon = (type: string) => {
    const colors: Record<string, string> = {
      postgres: 'text-sky-400',
      postgresql: 'text-sky-400',
      mysql: 'text-orange-400',
      mariadb: 'text-teal-400',
      mongodb: 'text-emerald-400',
      redis: 'text-rose-400',
    };
    return colors[type.toLowerCase()] || 'text-sky-400';
  };

  // Use real analytics data or fallback to database count
  const runningDatabases = analytics?.metrics.runningDatabases ?? databases.filter(db => db.status === 'RUNNING').length;
  const totalStorage = analytics?.metrics.totalStorage ?? 0;
  const databaseTypeOptions = Array.from(new Set(databases.map(d => d.databaseType.toLowerCase())));
  const filteredDatabases = dbFilter === 'all'
    ? databases
    : databases.filter(d => d.databaseType.toLowerCase() === dbFilter.toLowerCase());

  if (!user) {
    return (
      <>
        <Landing onGetStarted={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </>
    );
  }

  if (showDatabaseSelector) {
    return (
      <>
        <DatabaseSelector
          databaseTypes={databaseTypes}
          onSelectDatabase={(type) => {
            setSelectedDatabaseType(type);
            setShowDatabaseSelector(false);
            setIsModalOpen(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f14] to-[#0a0a0a] text-zinc-100">
      {/* Animated background effects */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[url('/grid.svg')] bg-[length:48px_48px]" />
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-screen w-16 border-r border-zinc-800/50 bg-zinc-950/60 backdrop-blur-xl flex flex-col items-center py-6 gap-6 z-40">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br p-1.5 flex items-center justify-center">
          <img src="/dbforge-logo.png" alt="DBForge" className="w-full h-full object-contain" />
        </div>

        <nav className="flex-1 flex flex-col items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'overview'
                ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
            title="Overview"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('databases')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'databases'
                ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
            title="Databases"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              activeTab === 'activity'
                ? 'bg-violet-500/20 text-violet-400 shadow-lg shadow-violet-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
            title="Activity"
          >
            <Activity className="w-4 h-4" />
          </button>

          <div className="w-8 h-px bg-zinc-800 my-2" />

          <button
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </nav>

        <div className="flex flex-col items-center gap-3">
          <div
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 cursor-pointer">
              {user.username.charAt(0).toUpperCase()}
            </div>
            {showProfileMenu && (
              <div className="absolute left-full ml-2 bottom-0 w-44 p-3 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl">
                <div className="text-xs font-medium text-zinc-200">{user.username}</div>
                <button
                  onClick={logout}
                  className="w-full mt-3 px-3 py-2 text-xs bg-zinc-800 text-zinc-200 rounded hover:bg-zinc-700 transition text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-16 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
          <div className="px-6 py-3.5 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                {activeTab === 'overview' ? 'Overview' : activeTab === 'databases' ? 'Databases' : 'Activity Log'}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeTab === 'overview' && 'Monitor your infrastructure at a glance'}
                {activeTab === 'databases' && 'Manage all your database instances'}
                {activeTab === 'activity' && 'Track all actions and events'}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-4 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="text-sm text-rose-300">{error}</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <main className="p-6 space-y-6">
            {/* Hero */}
            <div className="rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-[#0d0d12] via-[#0b0b10] to-[#0b0b0f] p-6 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.12),transparent_30%)]" />
              <div className="relative flex flex-col gap-3">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Control Room</div>
                <h2 className="text-3xl font-semibold text-zinc-50">Operate every database from one cockpit</h2>
                <p className="text-sm text-zinc-500 max-w-3xl">
                  Launch instances, keep an eye on health, and dive into workbenches without leaving this view.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowDatabaseSelector(true)}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-violet-500/25"
                  >
                    <Plus className="w-4 h-4" />
                    New Database
                  </button>
                  <button
                    onClick={() => setActiveTab('databases')}
                    className="px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800/70 text-sm font-medium flex items-center gap-2"
                  >
                    <Database className="w-4 h-4" />
                    Manage Instances
                  </button>
                </div>
              </div>
            </div>

            {/* Stats strip (unique) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatPill
                icon={<Database className="w-4 h-4 text-violet-300" />}
                label="Total Databases"
                value={databases.length}
                accent="violet"
              />
              <StatPill
                icon={<Zap className="w-4 h-4 text-emerald-300" />}
                label="Running"
                value={runningDatabases}
                accent="emerald"
              />
              <StatPill
                icon={<Activity className="w-4 h-4 text-rose-300" />}
                label="Stopped"
                value={analytics?.metrics.stoppedDatabases ?? databases.filter(d => d.status === 'STOPPED').length}
                accent="amber"
              />
              <StatPill
                icon={<HardDrive className="w-4 h-4 text-sky-300" />}
                label="Storage Used"
                value={`${totalStorage} MB`}
                accent="sky"
              />
            </div>

            {/* Activity + charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
              <Card title="Recent Activity" actionLabel="View all" onAction={() => setActiveTab('activity')}>
                <div className="space-y-2">
                  {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                    analytics.recentActivity.slice(0, 6).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          activity.status === 'RUNNING' ? 'bg-emerald-500' :
                          activity.status === 'STOPPED' ? 'bg-zinc-500' :
                          'bg-sky-500'
                        }`} />
                        <Database className="w-3.5 h-3.5 text-zinc-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-200 truncate">{activity.databaseName}</div>
                          <div className="text-[11px] text-zinc-500">{activity.action} • {activity.databaseType}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500">
                      <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">No recent activity</p>
                    </div>
                  )}
                </div>
              </Card>

              <div className="xl:col-span-2 space-y-4">
                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card title="Database Types">
                      {analytics.databasesByType.labels.length > 0 ? (
                        <DatabaseTypeChart 
                          labels={analytics.databasesByType.labels}
                          values={analytics.databasesByType.values}
                        />
                      ) : (
                        <EmptyChart />
                      )}
                    </Card>

                    <Card title="Instance Status">
                      {analytics.databasesByStatus.labels.length > 0 ? (
                        <DatabaseStatusChart 
                          labels={analytics.databasesByStatus.labels}
                          values={analytics.databasesByStatus.values}
                        />
                      ) : (
                        <EmptyChart />
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </div>

            {/* Active DBs row */}
            {databases.length > 0 && (
              <Card title="Active Databases" actionLabel="Manage all" onAction={() => setActiveTab('databases')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {databases.filter(db => db.status === 'RUNNING').slice(0, 6).map((db) => (
                    <div key={db.id} className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/30 transition-all group cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-zinc-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200 truncate">{db.instanceName}</div>
                          <div className="text-[11px] text-zinc-500">{db.databaseType}</div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.35)] animate-pulse" />
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {db.connectionInfo.host}:{db.connectionInfo.port}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Secondary actions (no duplicates) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ActionCard
                title="Import data"
                subtitle="Bring dumps/CSV (coming soon)"
                icon={<Download className="w-4 h-4" />}
              />
              <ActionCard
                title="Docs & API"
                subtitle="Endpoints and guides"
                icon={<FileText className="w-4 h-4" />}
              />
              <ActionCard
                title="Activity log"
                subtitle="Deep dive on recent actions"
                icon={<Activity className="w-4 h-4" />}
                onClick={() => setActiveTab('activity')}
              />
            </div>
          </main>
        )}

        {/* Databases Tab */}
        {activeTab === 'databases' && (
          <main className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400">Loading databases...</p>
                </div>
              </div>
            ) : databases.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Database className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 mb-2">No databases yet</p>
                  <button
                    onClick={() => setShowDatabaseSelector(true)}
                    className="mt-3 px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-white transition"
                  >
                    Create your first database
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDbFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      dbFilter === 'all'
                        ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    All types
                  </button>
                  {databaseTypeOptions.map(type => (
                    <button
                      key={type}
                      onClick={() => setDbFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize ${
                        dbFilter === type
                          ? 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDatabases.map((db) => (
                    <div
                      key={db.id}
                      onClick={() => setSelectedDatabase(db)}
                      className="group rounded-2xl border border-zinc-800/70 bg-gradient-to-br from-[#0e0e12] via-[#0b0b0f] to-[#0d0d12] p-5 space-y-4 cursor-pointer hover:border-violet-500/40 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/10"
                    >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900/70 flex items-center justify-center ${getDatabaseIcon(db.databaseType)}`}>
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-zinc-100">{db.instanceName}</h3>
                          <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{db.databaseType}</p>
                        </div>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(db.status)}`} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                        db.status === 'RUNNING' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : db.status === 'STOPPED'
                          ? 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {db.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-zinc-950/70 border border-zinc-800/70 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Host</span>
                        </div>
                        <code className="text-[11px] text-zinc-300 font-mono">{db.connectionInfo.host}:{db.connectionInfo.port}</code>
                      </div>

                      <div className="bg-zinc-950/70 border border-zinc-800/70 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Connection</span>
                          <button
                            onClick={() => copyToClipboard(db.connectionInfo.connectionString, `conn-${db.id}`)}
                            className="text-zinc-500 hover:text-zinc-300 transition"
                          >
                            {copiedField === `conn-${db.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <code className="text-[11px] text-zinc-300 break-all line-clamp-2 font-mono">
                          {db.connectionInfo.connectionString}
                        </code>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {db.status === 'RUNNING' ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWorkbenchDatabase(db);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/25"
                          >
                            <Code className="w-3.5 h-3.5" />
                            Query
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStopDatabase(db.id);
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/70 transition flex items-center justify-center gap-1.5"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartDatabase(db.id);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/25"
                          disabled={db.status === 'CREATING'}
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDatabase(db.id);
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                        disabled={db.status === 'CREATING'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <main className="p-6">
            <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-100 mb-3">Activity Log</h3>
              <div className="space-y-2">
                {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === 'RUNNING' ? 'bg-emerald-500' :
                        activity.status === 'STOPPED' ? 'bg-zinc-500' :
                        'bg-sky-500'
                      }`} />
                      <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                        <Database className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200">{activity.databaseName}</div>
                        <div className="text-xs text-zinc-500">{activity.action} • {activity.databaseType}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-zinc-500">No activity to display</p>
                  </div>
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      <CreateDatabaseModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isCreating) {
            setIsModalOpen(false);
            setSelectedDatabaseType(null);
          }
        }}
        onSubmit={handleCreateDatabase}
        databaseTypes={databaseTypes}
        isCreating={isCreating}
        preselectedType={selectedDatabaseType}
      />

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-3 py-2.5 rounded-lg shadow-lg border text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            } animate-in slide-in-from-right`}
          >
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {selectedDatabase && (
        <DatabaseDetailsModal
          database={selectedDatabase}
          isOpen={!!selectedDatabase}
          onClose={() => setSelectedDatabase(null)}
          onStart={handleStartDatabase}
          onStop={handleStopDatabase}
          onDelete={handleDeleteDatabase}
        />
      )}

      {workbenchDatabase && (
        <DatabaseWorkbench
          database={workbenchDatabase}
          isOpen={!!workbenchDatabase}
          onClose={() => setWorkbenchDatabase(null)}
        />
      )}
    </div>
  );
}

type StatPillProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent: 'violet' | 'emerald' | 'sky' | 'amber';
};

function StatPill({ icon, label, value, accent }: StatPillProps) {
  const accentClasses: Record<StatPillProps['accent'], string> = {
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-100',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100',
    sky: 'bg-sky-500/10 border-sky-500/20 text-sky-100',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-100',
  };

  return (
    <div className="rounded-xl border border-zinc-800/70 bg-[#0f1014] p-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg border ${accentClasses[accent]} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      </div>
      <div className="text-xl font-semibold text-zinc-50 leading-tight">{value}</div>
    </div>
  );
}

type ActionCardProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClick?: () => void;
};

function ActionCard({ title, subtitle, icon, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="group rounded-xl border border-zinc-800/60 bg-[#0d0d12] p-4 text-left hover:border-zinc-700 transition shadow-sm hover:shadow-lg hover:shadow-black/30 disabled:opacity-70"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-white">
          {icon}
        </div>
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
      </div>
      <div className="text-xs text-zinc-500">{subtitle}</div>
    </button>
  );
}

type CardProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

function Card({ title, actionLabel, onAction, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-[#0c0c10] p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-64 flex items-center justify-center text-zinc-500">
      <div className="text-center">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-xs">No data available</p>
      </div>
    </div>
  );
}

export default App;
