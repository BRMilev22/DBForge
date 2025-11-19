import { useState } from 'react';
import { Database } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGetStarted();
  };

  return (
    <div className="relative w-full flex flex-col items-center text-slate-200 bg-[#050810] min-h-screen">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[url('/grid.svg')] bg-[length:46px_46px]" />

      <section className="w-full flex justify-center px-6 pt-20 pb-32 relative">
        <div className="w-full max-w-6xl space-y-16">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-green-400 flex items-center justify-center shadow-xl">
                <Database className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <div className="font-bold tracking-wide text-lg">DBForge</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-slate-400">
                  Unified Database Cloud
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-2 border border-slate-700 px-4 py-1 rounded-full bg-slate-900/50">
                <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_2px_rgba(34,197,94,0.5)]" />
                Infrastructure online · Alpha
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <div className="border border-cyan-400/40 text-cyan-300 text-[11px] px-4 py-1 rounded-full bg-slate-900/40 tracking-[0.15em] uppercase">
                Live Now · Multi-database · API · UI
              </div>
              <div className="border border-slate-700 px-4 py-1 rounded-full bg-slate-900/40 text-[11px] text-slate-400">
                Built for developers who hate boilerplate.
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl">
              One{' '}
              <span className="bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
                secure platform
              </span>{' '}
              for all your databases.
            </h1>

            <p className="text-sm md:text-base text-slate-300 max-w-lg leading-relaxed">
              Deploy PostgreSQL, MySQL, MariaDB, MongoDB and Redis instances in seconds. 
              Manage everything from a beautiful dashboard. No servers. No backend code. Just ship.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="border border-slate-700 bg-slate-900/50 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
                <div className="font-semibold text-sm">Get started now</div>
                <p className="text-xs text-slate-400">
                  Create your account and deploy your first database in under 60 seconds.
                </p>

                <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-100 focus:border-cyan-400 outline-none"
                  />
                  <button 
                    type="submit"
                    className="px-6 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-400 to-cyan-400 text-slate-900 shadow-lg hover:brightness-110 transition"
                  >
                    Get started →
                  </button>
                </form>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-1 rounded-full border border-slate-700 bg-slate-900/30">
                    PostgreSQL · MySQL · MariaDB · MongoDB · Redis
                  </div>
                  <div className="px-4 py-1 rounded-full border border-slate-700 bg-slate-900/30">
                    Instant deployment · Auto-scaling
                  </div>
                </div>

                <div className="text-slate-400 mt-1">Supported engines:</div>
                <div className="flex flex-wrap gap-3">
                  {['PostgreSQL', 'MySQL', 'MariaDB', 'MongoDB', 'Redis'].map((db) => (
                    <div
                      key={db}
                      className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/30"
                    >
                      {db}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-cyan-500/10 blur-[120px] pointer-events-none" />
      </section>

      <section className="w-full flex justify-center px-6 pb-28">
        <div className="w-full max-w-6xl grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Zero backend setup',
              desc: 'Instant database provisioning and production-ready endpoints.',
            },
            {
              title: 'Universal access',
              desc: 'Connect via Docker, connection strings, or web dashboard.',
            },
            {
              title: 'Auto-managed',
              desc: 'Automated backups, monitoring, and resource scaling.',
            },
          ].map((b, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-slate-700 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-800/40 transition"
            >
              <div className="font-semibold text-lg mb-2 text-slate-100">{b.title}</div>
              <div className="text-sm text-slate-400">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full flex justify-center px-6 py-28">
        <div className="w-full max-w-6xl space-y-10">
          <div className="rounded-2xl border border-slate-700 bg-[#0c1324]/90 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="w-2 h-2 bg-yellow-300 rounded-full" />
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                </span>
                Dashboard · DBForge
              </div>
              <div className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/30">
                Web UI
              </div>
            </div>

            <div className="bg-[#070b16] border border-blue-900/30 text-[13px] text-slate-100 p-5 rounded-xl">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-300">Create database instance</span>
                </div>
                <div className="pl-8 text-slate-500 text-xs">
                  → Choose database type (PostgreSQL, MySQL, MariaDB, MongoDB, Redis)<br />
                  → Name your instance<br />
                  → Get connection details instantly
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full flex justify-center px-6 py-36">
        <div className="w-full max-w-6xl grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Many engines',
              desc: 'PostgreSQL, MySQL, MariaDB, MongoDB, Redis.',
            },
            {
              title: 'Security-first',
              desc: 'Isolated containers, encrypted connections, secure credentials.',
            },
            {
              title: 'Developer workflow',
              desc: 'Dashboard, CLI, REST API, Docker integration.',
            },
            {
              title: 'Instant deployments',
              desc: 'Deploy in seconds, automatic container management.',
            },
            {
              title: 'Full control',
              desc: 'Start, stop, restart, delete instances anytime.',
            },
            {
              title: 'Zero maintenance',
              desc: 'Hosting, backups, scaling — all automated.',
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-slate-700 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-800/40 transition"
            >
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                {String(i + 1).padStart(2, '0')} · Feature
              </div>
              <div className="font-semibold text-lg mb-1 text-slate-100">{f.title}</div>
              <div className="text-sm text-slate-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="w-full px-6 py-14 flex justify-center border-t border-slate-800 bg-[#03050a]">
        <div className="w-full max-w-6xl flex justify-between text-xs text-slate-500">
          <span>dbforge.dev · Docker hosted · Secure</span>
          <span className="flex gap-3">
            <span className="border border-slate-700 px-3 py-1 rounded-full">
              Alpha · Live Now
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
