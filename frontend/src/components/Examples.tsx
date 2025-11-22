import { useState } from "react";
import { motion } from "framer-motion";
import { Book, Terminal, Code, Database, Cpu, ChevronRight, Copy, Check, FolderOpen, FileCode, Download, ExternalLink, FileText, ArrowRight, ArrowLeft } from "lucide-react";

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border border-zinc-800 bg-[#0c0c10] overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400">
        <span className="uppercase">{language}</span>
        <button 
          onClick={handleCopy}
          className="p-1 hover:text-slate-100 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-slate-200">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function NavigationButtons({ 
  prevLabel, 
  prevTab, 
  nextLabel, 
  nextTab, 
  onNavigate 
}: { 
  prevLabel?: string; 
  prevTab?: string; 
  nextLabel?: string; 
  nextTab?: string; 
  onNavigate: (tab: string) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-zinc-800/60">
      {prevTab && prevLabel ? (
        <button
          onClick={() => onNavigate(prevTab)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-800/60 bg-[#0f1014] hover:bg-zinc-800/70 hover:border-purple-500/40 transition-all text-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-purple-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Previous</div>
            <div className="text-slate-200 font-medium">{prevLabel}</div>
          </div>
        </button>
      ) : (
        <div />
      )}
      
      {nextTab && nextLabel ? (
        <button
          onClick={() => onNavigate(nextTab)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all text-sm group"
        >
          <div className="text-right">
            <div className="text-xs text-purple-400 uppercase tracking-wide">Next</div>
            <div className="text-slate-200 font-medium">{nextLabel}</div>
          </div>
          <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
        </button>
      ) : null}
    </div>
  );
}

const EXAMPLE_PROJECTS = [
  {
    id: "mongodb-express-vue",
    name: "MongoDB + Express + Vue",
    description: "Innovation insights tracker with voting functionality. Demonstrates MongoDB integration with Express API and Vue frontend.",
    path: "/home/dbforge/new/DBForge/examples/mongodb-express-vue",
    stack: ["MongoDB", "Express", "Vue", "TypeScript"],
    color: "emerald",
    icon: "🍃",
    readme: `# DBForge MongoDB Showcase (Express + Vue)

This example demonstrates how the **DbForge Framework** can power a MongoDB experience end-to-end:

- **API (\`api/\`)** – Express + TypeScript server that stores "innovation insights" in a DBForge-managed MongoDB cluster.
- **Web (\`web/\`)** – Vue SPA that lists, filters, creates, and upvotes insights through the API.

## Backend setup

\`\`\`bash
cd api
cp .env.example .env.local      # fill in your Mongo connection info
npm install
npm run db:bootstrap            # seeds the dbforge_insights collection
npm run dev                     # starts http://localhost:4100
\`\`\`

## Frontend setup

\`\`\`bash
cd web
cp .env.example .env            # optional, defaults to http://localhost:4100
npm install
npm run dev -- --host           # Vite dev server on http://localhost:5173
\`\`\`

The UI provides a small "innovation radar" surface where you can add insights and upvote ideas.`
  },
  {
    id: "mysql-nextjs-auth",
    name: "MySQL + Next.js Auth",
    description: "Complete authentication flow with email/password. Features user registration, login, and session management with MySQL backend.",
    path: "/home/dbforge/new/DBForge/examples/mysql-nextjs-auth",
    stack: ["MySQL", "Next.js", "TypeScript", "Tailwind"],
    color: "blue",
    icon: "🔐",
    readme: `# DBForge MySQL + Next.js Auth Demo

This example showcases how the **DBForge Framework** can power a simple email/password flow inside a modern Next.js stack.

## Quick start

\`\`\`bash
cp .env.example .env.local    # configure credentials + session secret
npm install
npm run db:bootstrap          # create the dbforge_users table + demo account
npm run dev                   # start http://localhost:3100
\`\`\`

## What's included

- **\`src/lib/dbforge.ts\`** – singleton DbForgeClient configured via environment variables
- **\`src/lib/users.ts\`** – CRUD operations over the dbforge_users table
- **\`src/lib/session.ts\`** – minimal session implementation using HMAC-signed cookies
- **\`src/app/api/*\`** – route handlers for register, login, and session
- **\`scripts/bootstrap.ts\`** – setup script that creates the table + demo user

Demo credentials: \`demo@dbforge.dev / dbforge-demo\``
  },
  {
    id: "postgres-fastify-svelte",
    name: "PostgreSQL + Fastify + Svelte",
    description: "Task management application with CRUD operations. Minimal Fastify API paired with a Vite/Svelte frontend.",
    path: "/home/dbforge/new/DBForge/examples/postgres-fastify-svelte",
    stack: ["PostgreSQL", "Fastify", "Svelte", "TypeScript"],
    color: "sky",
    icon: "✅",
    readme: `# DBForge PostgreSQL Showcase (Fastify + Svelte)

This example pairs a minimal Fastify API with a Vite/Svelte frontend.

- **Backend:** Fastify (TypeScript) exposing \`/tasks\` endpoints powered by DbForgeClient
- **Frontend:** Svelte single page app that calls the API

## Backend setup

\`\`\`bash
cd server
cp .env.example .env              # fill with your DBForge Postgres credentials
npm install
npm run db:bootstrap              # creates dbforge_tasks table + seeds starter rows
npm run dev                       # starts Fastify on http://localhost:4000
\`\`\`

## Frontend setup

\`\`\`bash
cd web
cp .env.example .env
npm install
npm run dev -- --host             # serves http://localhost:5173
\`\`\``
  },
  {
    id: "redis-koa-solid",
    name: "Redis + Koa + SolidJS",
    description: "Team check-in system using Redis Streams. Real-time feed with active teammates tracking using Redis hash.",
    path: "/home/dbforge/new/DBForge/examples/redis-koa-solid",
    stack: ["Redis", "Koa", "SolidJS", "Streams"],
    color: "rose",
    icon: "⚡",
    readme: `# DBForge Redis Showcase (Koa + SolidJS)

This example highlights how the DBForge Framework makes Redis approachable:

- **API (\`api/\`)** – Koa server that logs team check-ins into a Redis Stream
- **Web (\`web/\`)** – SolidJS SPA that submits updates and renders the live feed

## Backend setup

\`\`\`bash
cd api
cp .env.example .env.local      # update with your Redis instance
npm install
npm run db:bootstrap            # seeds sample check-ins
npm run dev                     # http://localhost:4200
\`\`\`

## Frontend setup

\`\`\`bash
cd web
npm install
npm run dev -- --host           # http://localhost:5173
\`\`\``
  }
];

const PYTHON_EXAMPLE_PROJECTS = [
  {
    id: "mysql-fastapi-notes",
    name: "MySQL + FastAPI Notes",
    description: "Note-taking application with FastAPI backend. Demonstrates MySQL integration with CRUD operations for managing notes.",
    path: "/home/dbforge/new/DBForge/examples-py/mysql-fastapi-notes",
    stack: ["MySQL", "FastAPI", "Python", "HTML/CSS"],
    color: "blue",
    icon: "📝",
  },
  {
    id: "postgres-fastapi-tasks",
    name: "PostgreSQL + FastAPI Tasks",
    description: "Task management system with toggle and delete functionality. Features PostgreSQL backend with FastAPI for task CRUD operations.",
    path: "/home/dbforge/new/DBForge/examples-py/postgres-fastapi-tasks",
    stack: ["PostgreSQL", "FastAPI", "Python", "HTML/CSS"],
    color: "cyan",
    icon: "✅",
  },
  {
    id: "mongo-fastapi-catalog",
    name: "MongoDB + FastAPI Catalog",
    description: "Product catalog with full CRUD capabilities. Showcases MongoDB document operations through FastAPI endpoints.",
    path: "/home/dbforge/new/DBForge/examples-py/mongo-fastapi-catalog",
    stack: ["MongoDB", "FastAPI", "Python", "HTML/CSS"],
    color: "green",
    icon: "📦",
  },
  {
    id: "redis-fastapi-queue",
    name: "Redis + FastAPI Queue",
    description: "Message queue system using Redis lists. Demonstrates enqueue/dequeue operations with FastAPI for queue management.",
    path: "/home/dbforge/new/DBForge/examples-py/redis-fastapi-queue",
    stack: ["Redis", "FastAPI", "Python", "HTML/CSS"],
    color: "red",
    icon: "🔄",
  }
];

const SHARED_PYTHON_README = `# DBForge Python Examples (FastAPI)

Four small full-stack demos, one per database type, mirroring the JS/TS examples:

- **mysql-fastapi-notes** – note-taking UI backed by a MySQL table.
- **postgres-fastapi-tasks** – task list with toggle + delete on PostgreSQL.
- **mongo-fastapi-catalog** – product catalog CRUD on MongoDB.
- **redis-fastapi-queue** – enqueue/consume queue using Redis lists.

Each example:
- uses **FastAPI** + **dbforge-framework** for DB access.
- serves a minimal HTML frontend at \`/\`.
- reads connection settings from \`.env\` (see each \`.env.example\`).

## Quick start (any example)

\`\`\`bash
cd examples-py/<example-folder>
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional: edit with your DBForge instance values
# or: cp .env.example .env.local (the app loads both .env and .env.local)
uvicorn main:app --reload --port 8800
\`\`\`

Then open \`http://localhost:8800\` to use the UI.

## Notes

- The MySQL example ships with the provided DBForge instance credentials prefilled in \`.env.example\` so it runs immediately against \`mysql_test1\`.
- The other examples include placeholders—fill in your DBForge host/port/user/pass/db before running.
- Each backend also exposes JSON APIs under \`/api/*\` if you want to test with \`curl\` or Postman.`;

export default function Examples({ onBack, initialTab, initialExpanded }: { onBack: () => void; initialTab?: string; initialExpanded?: string[] }) {
  const [activeTab, setActiveTab] = useState<string>(initialTab || "intro");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(initialExpanded || ["js"]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectedProjectData = EXAMPLE_PROJECTS.find(p => p.id === selectedProject);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800/60 bg-[#0c0c10]/80 backdrop-blur-sm p-6 hidden md:block fixed h-full top-0 left-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <img src="/dbforge-logo.png" alt="DBForge" className="w-8 h-8 rounded-lg" />
          <span className="font-bold tracking-wide">DBForge</span>
        </div>
        
        <div className="space-y-2">
          {/* Introduction */}
          <button
            onClick={() => {
              setActiveTab("intro");
              setSelectedProject(null);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
              activeTab === "intro" 
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-slate-200"
            }`}
          >
            <Book className="w-4 h-4" />
            Introduction
            {activeTab === "intro" && <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>

          {/* JavaScript/TypeScript Section */}
          <div>
            <button
              onClick={() => toggleSection("js")}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-slate-300 hover:bg-zinc-800/50 font-semibold"
            >
              <Code className="w-4 h-4 text-purple-400" />
              JavaScript/TypeScript
              <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${expandedSections.includes("js") ? "rotate-90" : ""}`} />
            </button>
            {expandedSections.includes("js") && (
              <div className="ml-6 mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("js-install");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "js-install" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Installation
                </button>
                <button
                  onClick={() => {
                    setActiveTab("js-connect");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "js-connect" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Connecting
                </button>
                <button
                  onClick={() => {
                    setActiveTab("js-crud");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "js-crud" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  CRUD Operations
                </button>
                <button
                  onClick={() => {
                    setActiveTab("examples");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "examples" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Example Projects
                </button>
              </div>
            )}
          </div>

          {/* Python Section */}
          <div>
            <button
              onClick={() => toggleSection("python")}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-slate-300 hover:bg-zinc-800/50 font-semibold"
            >
              <FileText className="w-4 h-4 text-fuchsia-400" />
              Python
              <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${expandedSections.includes("python") ? "rotate-90" : ""}`} />
            </button>
            {expandedSections.includes("python") && (
              <div className="ml-6 mt-1 space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("py-install");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "py-install" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Installation
                </button>
                <button
                  onClick={() => {
                    setActiveTab("py-connect");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "py-connect" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Connecting
                </button>
                <button
                  onClick={() => {
                    setActiveTab("py-crud");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "py-crud" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  CRUD Operations
                </button>
                <button
                  onClick={() => {
                    setActiveTab("py-examples");
                    setSelectedProject(null);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    activeTab === "py-examples" 
                      ? "bg-purple-500/10 text-purple-400" 
                      : "text-zinc-400 hover:text-slate-200"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Example Projects
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800/60">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Links</div>
          <div className="space-y-3 text-sm text-zinc-400">
            <a href="https://www.npmjs.com/package/dbforge-framework" target="_blank" rel="noreferrer" className="block hover:text-purple-400 transition">NPM Package (JS/TS)</a>
            <a href="https://pypi.org/project/dbforge-framework/" target="_blank" rel="noreferrer" className="block hover:text-purple-400 transition">PyPI Package (Python)</a>
            <a href="https://github.com/BRMilev22/DBForge" target="_blank" rel="noreferrer" className="block hover:text-purple-400 transition">GitHub Repo</a>
            <button onClick={onBack} className="block hover:text-purple-400 transition text-left w-full">← Back to Home</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-0 md:ml-64 p-8 md:p-16 max-w-4xl">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-12"
        >
          {activeTab === "intro" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-4">DBForge Framework</h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Official client libraries for interacting with DBForge-managed databases. 
                  Available for JavaScript/TypeScript and Python with one unified API for MySQL, PostgreSQL, MongoDB, and Redis.
                </p>
                <div className="mt-6 flex gap-4">
                  <div className="px-4 py-2 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 text-sm font-semibold">
                    JavaScript/TypeScript
                  </div>
                  <div className="px-4 py-2 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400 text-sm font-semibold">
                    Python
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0f1014]">
                  <Cpu className="w-8 h-8 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Multi-Database Support</h3>
                  <p className="text-sm text-slate-400">
                    Connect to SQL (MySQL, Postgres) and NoSQL (Mongo, Redis) databases using a consistent interface.
                  </p>
                </div>
                <div className="p-6 rounded-xl border border-zinc-800/60 bg-[#0f1014]">
                  <Database className="w-8 h-8 text-fuchsia-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Flexible Connections</h3>
                  <p className="text-sm text-slate-400">
                    Supports both API Token authentication (no creds needed) and direct driver connections.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "js-install" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">Installation - JavaScript/TypeScript</h1>
                <p className="text-slate-400 mb-6">
                  Install the framework via NPM. You'll also need to install the drivers for the specific databases you plan to use.
                </p>
                <CodeBlock 
                  language="bash" 
                  code="npm install dbforge-framework mongodb mysql2 pg redis" 
                />
              </div>
              
              <NavigationButtons 
                nextLabel="Connecting"
                nextTab="js-connect"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "js-connect" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">Connecting</h1>
                <p className="text-slate-400 mb-6">
                  You can connect using connection strings, explicit credentials, or API tokens (if using the DBForge API proxy).
                </p>
                
                <h3 className="text-xl font-semibold mb-3 mt-8">Using Credentials</h3>
                <CodeBlock 
                  language="javascript" 
                  code={`import { DbForgeClient } from 'dbforge-framework';

// Connect to MySQL
const client = DbForgeClient.fromCredentials({
  dbType: 'mysql',
  host: 'localhost',
  port: 10010,
  username: 'db_user',
  password: 'db_password',
  database: 'my_database'
});

await client.connect();
console.log('Connected!');`} 
                />

                <h3 className="text-xl font-semibold mb-3 mt-8">Using Connection String</h3>
                <CodeBlock 
                  language="javascript" 
                  code={`// Connect to MongoDB
const client = DbForgeClient.fromConnectionString(
  'mongodb://user:pass@localhost:10030/mydb'
);

await client.connect();`} 
                />
              </div>
              
              <NavigationButtons 
                prevLabel="Installation"
                prevTab="js-install"
                nextLabel="CRUD Operations"
                nextTab="js-crud"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "js-crud" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">CRUD Operations - JavaScript/TypeScript</h1>
                <p className="text-slate-400 mb-6">
                  The framework provides unified helpers for common operations like Select, Insert, Update, and Delete.
                </p>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-400">Select / Find</h3>
                    <CodeBlock 
                      language="javascript" 
                      code={`// SQL (MySQL/Postgres)
const users = await client.select('users', { 
  where: { status: 'active' }, 
  limit: 10 
});

// MongoDB
const docs = await client.select('users', { 
  where: { role: 'admin' } 
});

// Redis
const value = await client.select('my_key');`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-400">Insert / Create</h3>
                    <CodeBlock 
                      language="javascript" 
                      code={`// SQL & Mongo
await client.insert('users', { 
  name: 'John Doe', 
  email: 'john@example.com' 
});

// Redis (SET)
await client.insert('session_id', 'user_123');`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-yellow-400">Direct Query</h3>
                    <p className="text-sm text-slate-400 mb-2">For advanced usage, use the raw query method.</p>
                    <CodeBlock 
                      language="javascript" 
                      code={`// SQL
await client.query('SELECT * FROM users JOIN orders ON ...');

// Mongo
await client.query({ 
  collection: 'users', 
  action: 'aggregate', 
  pipeline: [...] 
});

// Redis
await client.query(['HGETALL', 'user:1001']);`} 
                    />
                  </div>
                </div>
              </div>
              
              <NavigationButtons 
                prevLabel="Connecting"
                prevTab="js-connect"
                nextLabel="Example Projects"
                nextTab="examples"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "py-install" && (
            <div className="space-y-12">
              {/* Header */}
              <div>
                <h1 className="text-3xl font-bold mb-4">Installation - Python</h1>
                <p className="text-slate-400 mb-6">
                  The DBForge Python framework is available on PyPI. Install it using pip with all database drivers or choose specific drivers.
                </p>
                <div className="mb-6 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                  <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                    <Check className="w-5 h-5" />
                    <span>Now Available on PyPI</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    Install with: <code className="px-2 py-1 rounded bg-slate-800 text-purple-400">pip install dbforge-framework[all]</code>
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-4">Installation Options</h2>
                <p className="text-slate-400 mb-4">
                  Install with all database drivers:
                </p>
                <CodeBlock 
                  language="bash" 
                  code="pip install dbforge-framework[all]" 
                />
                <p className="text-slate-400 mt-4 mb-4">
                  Or install only the drivers you need:
                </p>
                <CodeBlock 
                  language="bash" 
                  code={`# PostgreSQL only
pip install dbforge-framework[postgres]

# MySQL only
pip install dbforge-framework[mysql]

# MongoDB only
pip install dbforge-framework[mongo]

# Redis only
pip install dbforge-framework[redis]`} 
                />
              </div>
              
              <NavigationButtons 
                nextLabel="Connecting"
                nextTab="py-connect"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "py-connect" && (
            <div className="space-y-12">
              <div>
                <h1 className="text-3xl font-bold mb-4">Connecting - Python</h1>
                <p className="text-slate-400 mb-6">
                  Connect to your databases using credentials, connection strings, or API tokens.
                </p>
              </div>

              {/* Connection Methods */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Connection Methods</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-purple-400">From Credentials</h3>
                    <CodeBlock 
                      language="python" 
                      code={`from dbforge_framework import DbForgeClient

client = DbForgeClient.from_credentials(
    db_type="postgresql",  # postgresql, mysql, mariadb, mongodb, redis
    host="localhost",
    port=5432,
    username="user",
    password="pass",
    database="mydb"
)`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-green-400">From Connection String</h3>
                    <CodeBlock 
                      language="python" 
                      code={`# PostgreSQL
client = DbForgeClient.from_connection_string(
    "postgresql://user:pass@host:5432/db"
)

# MySQL
client = DbForgeClient.from_connection_string(
    "mysql://user:pass@host:3306/db"
)

# MongoDB
client = DbForgeClient.from_connection_string(
    "mongodb://user:pass@host:27017/db",
    authSource="admin"
)

# Redis
client = DbForgeClient.from_connection_string(
    "redis://user:pass@host:6379/0"
)`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-purple-400">From API Token</h3>
                    <CodeBlock 
                      language="python" 
                      code={`client = DbForgeClient.from_api_token(
    api_token="your-api-token",
    instance_id="db-instance-id"
)`} 
                    />
                  </div>
                </div>
              </div>

              {/* Database-Specific Examples */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Database-Specific Examples</h2>
                <p className="text-slate-400 mb-4">
                  Complete examples showing how to connect and use each database type.
                </p>
              </div>
              
              <NavigationButtons 
                prevLabel="Installation"
                prevTab="py-install"
                nextLabel="CRUD Operations"
                nextTab="py-crud"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "py-crud" && (
            <div className="space-y-12">
              <div>
                <h1 className="text-3xl font-bold mb-4">CRUD Operations - Python</h1>
                <p className="text-slate-400 mb-6">
                  Three ways to work with data in Python: direct methods, helpers, or raw queries.
                </p>
              </div>

              {/* CRUD Operations */}
              <div>
                <h2 className="text-2xl font-bold mb-4">API Patterns</h2>
                <p className="text-slate-400 mb-6">
                  Three ways to work with data: direct methods, helpers, or raw queries.
                </p>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-purple-400">Pattern 1: Direct Methods</h3>
                    <CodeBlock 
                      language="python" 
                      code={`with client:
    # SELECT
    users = client.select("users", 
                         columns=["id", "name"],
                         where={"status": "active"},
                         limit=10,
                         order_by="created_at DESC")
    
    # INSERT
    client.insert("users", {"name": "Alice", "age": 25})
    
    # UPDATE
    client.update("users", {"age": 26}, {"name": "Alice"})
    
    # DELETE
    client.delete("users", {"name": "Alice"})`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-green-400">Pattern 2: Helpers</h3>
                    <CodeBlock 
                      language="python" 
                      code={`with client:
    # Find all
    users = client.helpers.find_all("users", {"age": 25})
    
    # Find one
    user = client.helpers.find_one("users", {"id": 1})
    
    # Insert
    client.helpers.insert("users", {"name": "Bob"})
    
    # Update
    client.helpers.update("users", {"age": 26}, {"id": 1})
    
    # Delete
    client.helpers.delete("users", {"id": 1})`} 
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-yellow-400">Pattern 3: Raw Queries</h3>
                    <CodeBlock 
                      language="python" 
                      code={`with client:
    # SQL databases
    users = client.query(
        "SELECT * FROM users WHERE age > %s",
        (18,)
    )
    
    # MongoDB (via helpers)
    collection = client.get_collection("users")
    users = collection.find({"age": {"$gt": 18}})
    
    # Redis (via helpers)
    client.helpers.set("key", "value", ex=3600)
    value = client.helpers.get("key")`} 
                    />
                  </div>
                </div>
              </div>

              {/* Context Manager */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Context Manager</h2>
                <p className="text-slate-400 mb-4">
                  Use Python's <code className="px-2 py-1 rounded bg-slate-800 text-purple-400">with</code> statement for automatic connection handling:
                </p>
                <CodeBlock 
                  language="python" 
                  code={`# Automatic connection and cleanup
with client:
    users = client.select("users")
    # Connection automatically closed when block exits

# Or manual connection management
client.connect()
try:
    users = client.select("users")
finally:
    client.disconnect()`} 
                />
              </div>

              {/* Links */}
              <div className="p-6 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <h3 className="text-xl font-semibold mb-4">Resources</h3>
                <div className="space-y-3">
                  <a 
                    href="https://pypi.org/project/dbforge-framework/" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>PyPI Package</span>
                  </a>
                  <a 
                    href="https://github.com/BRMilev22/DBForge/tree/main/framework-py" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>GitHub Repository</span>
                  </a>
                </div>
              </div>
              
              <NavigationButtons 
                prevLabel="Connecting"
                prevTab="py-connect"
                nextLabel="Example Projects"
                nextTab="py-examples"
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  setSelectedProject(null);
                }}
              />
            </div>
          )}

          {activeTab === "examples" && !selectedProject && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-4">Example Projects - JavaScript/TypeScript</h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Complete examples showing how to build modern web applications with the DBForge Framework using JavaScript/TypeScript. 
                  Each project uses a different tech stack and demonstrates real-world patterns.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {EXAMPLE_PROJECTS.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="p-6 rounded-xl border border-zinc-800/60 bg-[#0f1014] hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{project.icon}</div>
                      <div className={`px-2 py-1 rounded text-xs font-medium bg-${project.color}-500/10 text-${project.color}-400 border border-${project.color}-500/20`}>
                        {project.stack[0]}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.stack.map((tech) => (
                        <span key={tech} className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300">
                      <span>View Project</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "examples" && selectedProject && selectedProjectData && (
            <div className="space-y-6">
              {/* Project Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-[#0f1014] hover:bg-zinc-800/70 transition text-sm"
                  >
                    ← Back
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <span className="text-3xl">{selectedProjectData.icon}</span>
                      {selectedProjectData.name}
                    </h1>
                    <p className="text-slate-400 mt-1">{selectedProjectData.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://github.com/BRMilev22/DBForge/tree/main/examples/${selectedProjectData.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg border border-zinc-800/60 bg-[#0f1014] hover:bg-zinc-800/70 transition text-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Clone
                  </a>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="flex flex-wrap gap-2">
                {selectedProjectData.stack.map((tech) => (
                  <span key={tech} className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-200 border border-slate-700">
                    {tech}
                  </span>
                ))}
              </div>

              {/* README Content */}
              <div className="rounded-xl border border-zinc-800/60 bg-[#0f1014] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">README.md</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedProjectData.readme)}
                    className="p-1.5 hover:bg-slate-800 rounded transition"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="prose prose-invert prose-slate max-w-none">
                    {selectedProjectData.readme.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) {
                        return <h1 key={i} className="text-2xl font-bold mb-4 mt-6">{line.replace('# ', '')}</h1>;
                      } else if (line.startsWith('## ')) {
                        return <h2 key={i} className="text-xl font-semibold mb-3 mt-5">{line.replace('## ', '')}</h2>;
                      } else if (line.startsWith('- **')) {
                        // Handle bold list items with inline code
                        const content = line.replace('- ', '');
                        const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g);
                        return (
                          <li key={i} className="text-slate-300 ml-4 mb-1">
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                const inner = part.slice(2, -2);
                                if (inner.startsWith('`') && inner.endsWith('`')) {
                                  return <code key={j} className="px-1 py-0.5 rounded bg-slate-800 text-sm text-purple-400 font-semibold">{inner.slice(1, -1)}</code>;
                                }
                                return <strong key={j}>{inner}</strong>;
                              } else if (part.startsWith('`') && part.endsWith('`')) {
                                return <code key={j} className="px-1 py-0.5 rounded bg-slate-800 text-sm text-purple-400">{part.slice(1, -1)}</code>;
                              }
                              return <span key={j}>{part}</span>;
                            })}
                          </li>
                        );
                      } else if (line.startsWith('- ')) {
                        return <li key={i} className="text-slate-300 ml-4 mb-1">{line.replace('- ', '')}</li>;
                      } else if (line.startsWith('```')) {
                        return null; // Code blocks handled separately
                      } else if (line.trim() === '') {
                        return <br key={i} />;
                      } else {
                        // Handle inline code and bold text in regular paragraphs
                        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
                        return (
                          <p key={i} className="text-slate-300 mb-2">
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                              } else if (part.startsWith('`') && part.endsWith('`')) {
                                return <code key={j} className="px-1 py-0.5 rounded bg-slate-800 text-sm text-purple-400">{part.slice(1, -1)}</code>;
                              }
                              return <span key={j}>{part}</span>;
                            })}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "py-examples" && !selectedProject && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-4">Example Projects - Python</h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Complete examples showing how to build modern web applications with the DBForge Framework using Python and FastAPI. 
                  Each project demonstrates database-specific operations with a minimal frontend.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {PYTHON_EXAMPLE_PROJECTS.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="p-6 rounded-xl border border-zinc-800/60 bg-[#0f1014] hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{project.icon}</div>
                      <div className={`px-2 py-1 rounded text-xs font-medium bg-${project.color}-500/10 text-${project.color}-400 border border-${project.color}-500/20`}>
                        {project.stack[0]}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.stack.map((tech) => (
                        <span key={tech} className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300">
                      <span>View Project</span>
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "py-examples" && selectedProject && (
            <div className="space-y-6">
              {(() => {
                const selectedPythonProject = PYTHON_EXAMPLE_PROJECTS.find(p => p.id === selectedProject);
                if (!selectedPythonProject) return null;
                
                return (
                  <>
                    {/* Project Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="px-3 py-2 rounded-lg border border-zinc-800/60 bg-[#0f1014] hover:bg-zinc-800/70 transition text-sm"
                        >
                          ← Back
                        </button>
                        <div>
                          <h1 className="text-3xl font-bold flex items-center gap-3">
                            <span className="text-3xl">{selectedPythonProject.icon}</span>
                            {selectedPythonProject.name}
                          </h1>
                          <p className="text-slate-400 mt-1">{selectedPythonProject.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`https://github.com/BRMilev22/DBForge/tree/main/examples-py/${selectedPythonProject.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-lg border border-zinc-800/60 bg-[#0f1014] hover:bg-zinc-800/70 transition text-sm flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Clone
                        </a>
                      </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-2">
                      {selectedPythonProject.stack.map((tech) => (
                        <span key={tech} className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-200 border border-slate-700">
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Shared README Content */}
                    <div className="rounded-xl border border-zinc-800/60 bg-[#0f1014] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/50">
                        <div className="flex items-center gap-2 text-sm">
                          <FileCode className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">README.md (Shared for all Python examples)</span>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(SHARED_PYTHON_README)}
                          className="p-1.5 hover:bg-slate-800 rounded transition"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                      <div className="p-6">
                        <div className="prose prose-invert prose-slate max-w-none">
                          {SHARED_PYTHON_README.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) {
                              return <h1 key={i} className="text-2xl font-bold mb-4 mt-6">{line.slice(2)}</h1>;
                            } else if (line.startsWith('## ')) {
                              return <h2 key={i} className="text-xl font-semibold mb-3 mt-5">{line.slice(3)}</h2>;
                            } else if (line.startsWith('```')) {
                              const codeBlock = [];
                              let j = i + 1;
                              while (j < SHARED_PYTHON_README.split('\n').length && !SHARED_PYTHON_README.split('\n')[j].startsWith('```')) {
                                codeBlock.push(SHARED_PYTHON_README.split('\n')[j]);
                                j++;
                              }
                              return <CodeBlock key={i} language="bash" code={codeBlock.join('\n')} />;
                            } else if (line.startsWith('- ')) {
                              return (
                                <p key={i} className="text-slate-300 mb-2 pl-4">
                                  • {line.slice(2).split(/(\*\*.*?\*\*|`.*?`)/).map((part, j) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={j} className="text-slate-100">{part.slice(2, -2)}</strong>;
                                    } else if (part.startsWith('`') && part.endsWith('`')) {
                                      return <code key={j} className="px-1 py-0.5 rounded bg-slate-800 text-sm text-purple-400">{part.slice(1, -1)}</code>;
                                    }
                                    return <span key={j}>{part}</span>;
                                  })}
                                </p>
                              );
                            } else if (line.trim() === '') {
                              return <div key={i} className="h-2" />;
                            } else {
                              return (
                                <p key={i} className="text-slate-300 mb-2">
                                  {line.split(/(\*\*.*?\*\*|`.*?`)/).map((part, j) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={j} className="text-slate-100">{part.slice(2, -2)}</strong>;
                                    } else if (part.startsWith('`') && part.endsWith('`')) {
                                      return <code key={j} className="px-1 py-0.5 rounded bg-slate-800 text-sm text-purple-400">{part.slice(1, -1)}</code>;
                                    }
                                    return <span key={j}>{part}</span>;
                                  })}
                                </p>
                              );
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
