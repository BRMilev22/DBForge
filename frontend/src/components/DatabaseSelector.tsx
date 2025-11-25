import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { DatabaseType } from '../types/database';
import { PostgresLogo, MySQLLogo, MariaDBLogo, MongoDBLogo, RedisLogo } from './DatabaseLogos';

interface DatabaseSelectorProps {
  databaseTypes: DatabaseType[];
  onSelectDatabase: (type: string) => void;
  onClose?: () => void;
}

const databaseLogos: Record<string, { color: string; gradient: string; description: string; portRange: string; Logo: React.ComponentType<{ className?: string }> }> = {
  postgres: {
    color: '#336791',
    gradient: 'from-blue-500 to-blue-700',
    description: 'Advanced open-source relational database with powerful features',
    portRange: '10000-10009',
    Logo: PostgresLogo
  },
  postgresql: {
    color: '#336791',
    gradient: 'from-blue-500 to-blue-700',
    description: 'Advanced open-source relational database with powerful features',
    portRange: '10000-10009',
    Logo: PostgresLogo
  },
  mysql: {
    color: '#00758F',
    gradient: 'from-blue-400 to-cyan-600',
    description: 'Most popular open-source relational database management system',
    portRange: '10010-10019',
    Logo: MySQLLogo
  },
  mariadb: {
    color: '#003545',
    gradient: 'from-cyan-700 to-blue-900',
    description: 'MySQL-compatible database server with enhanced features',
    portRange: '10020-10029',
    Logo: MariaDBLogo
  },
  mongodb: {
    color: '#47A248',
    gradient: 'from-green-500 to-green-700',
    description: 'Leading NoSQL document database for modern applications',
    portRange: '10030-10039',
    Logo: MongoDBLogo
  },
  redis: {
    color: '#DC382D',
    gradient: 'from-red-500 to-red-700',
    description: 'In-memory data structure store for caching and real-time applications',
    portRange: '10040-10049',
    Logo: RedisLogo
  }
};

export default function DatabaseSelector({ databaseTypes, onSelectDatabase, onClose }: DatabaseSelectorProps) {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        {onClose && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 flex items-center justify-center transition-all group"
            title="Close"
          >
            <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-100" />
          </motion.button>
        )}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl font-semibold mb-2 text-zinc-100">
            Choose Your Database
          </h1>
          <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
            Select a database type to create a new instance. Each database will be provisioned in seconds with full container isolation.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {databaseTypes.map((db) => {
            const DefaultLogo = ({ className }: { className?: string }) => (
              <svg viewBox="0 0 24 24" className={className} fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            );
            
            const info = databaseLogos[db.name.toLowerCase()] || {
              color: '#52525b',
              gradient: 'from-zinc-500 to-zinc-700',
              description: 'Database management system',
              portRange: 'N/A',
              Logo: DefaultLogo
            };

            return (
              <motion.div
                key={db.name}
                variants={item}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative"
              >
                <div className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-all hover:shadow-xl hover:shadow-violet-500/10">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 group-hover:border-zinc-600 transition-all p-2.5">
                    <info.Logo className="w-full h-full" />
                  </div>

                  <h3 className="text-lg font-semibold mb-1.5 capitalize">{db.displayName}</h3>
                  <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                    {info.description}
                  </p>

                  <div className="space-y-1.5 mb-4 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                      <span>Port range: {info.portRange}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-sky-500"></div>
                      <span>Docker-based isolation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-violet-500"></div>
                      <span>Ready in seconds</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectDatabase(db.name)}
                    className="w-full py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white transition-all shadow-lg shadow-violet-500/25"
                  >
                    Create {db.displayName}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-zinc-400">All systems operational</span>
            </div>
            <div className="w-px h-3 bg-zinc-800"></div>
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-300 font-semibold">{databaseTypes.length}</span> database types available
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
