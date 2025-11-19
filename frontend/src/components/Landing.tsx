import { useEffect, useState, useRef, useMemo } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Mail, Zap, Shield, Layers } from "lucide-react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  const [scrolled, setScrolled] = useState(false);
  const [particlesLoaded, setParticlesLoaded] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"]
  });

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.3]);
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.8], [0.08, 0.02]);
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesLoaded(true);
    });
  }, []);

  const particlesOptions = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: "grab",
        },
        resize: {
          enable: true,
        },
      },
      modes: {
        grab: {
          distance: 140,
          links: {
            opacity: 0.5,
          },
        },
      },
    },
    particles: {
      color: {
        value: ["#06b6d4", "#10b981", "#3b82f6"],
      },
      links: {
        color: "#06b6d4",
        distance: 150,
        enable: true,
        opacity: 0.15,
        width: 1,
      },
      move: {
        enable: true,
        outModes: {
          default: "bounce" as const,
        },
        random: true,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
        },
        value: 80,
      },
      opacity: {
        value: { min: 0.1, max: 0.4 },
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={targetRef} className="relative w-full min-h-screen overflow-x-hidden flex flex-col items-center text-slate-200 bg-[#050810]">
      {/* Dynamic Animated Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Particles Background */}
        {particlesLoaded && (
          <Particles
            id="tsparticles"
            options={particlesOptions}
            className="absolute inset-0"
          />
        )}
        
        {/* Animated Grid */}
        <motion.div 
          className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:46px_46px]"
          style={{
            opacity: backgroundOpacity,
            scale: backgroundScale,
            y: backgroundY,
            backgroundPosition: "center"
          }}
        />
        
        {/* Gradient Overlays */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-green-500/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      <div className="w-full flex justify-center px-6 pt-20 pb-32 relative">
        <div className="w-full max-w-6xl space-y-16">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <motion.img 
                src="/dbforge-logo.png" 
                alt="DBForge" 
                className="w-10 h-10 rounded-lg shadow-xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
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
              {/* <button 
                onClick={onGetStarted}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-400 to-cyan-400 text-slate-900 shadow-lg hover:brightness-110 transition"
              >
                Get Started →
              </button> */}
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.3 } }}
                className="border border-cyan-400/40 text-cyan-300 text-[11px] px-4 py-1 rounded-full bg-slate-900/40 tracking-[0.15em] uppercase"
              >
                Coming soon · Multi-database · API · UI
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.4 } }}
                className="border border-slate-700 px-4 py-1 rounded-full bg-slate-900/40 text-[11px] text-slate-400"
              >
                Built for developers who hate boilerplate.
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.6, ease: "easeOut" } }}
              className="text-5xl md:text-6xl font-extrabold leading-tight max-w-3xl"
            >
              Self-hosted{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent">
                database management
              </span>{" "}
              made simple.
            </motion.h1>

            <p className="text-sm md:text-base text-slate-300 max-w-lg leading-relaxed">
              Create, manage, and connect to multiple database instances (PostgreSQL, MySQL, MariaDB, MongoDB, Redis) through a modern web interface. All powered by Docker.
            </p>

            <motion.div initial="hidden" animate="visible" variants={container} className="grid md:grid-cols-2 gap-8">
              <div className="border border-slate-700 bg-slate-900/50 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
                <div className="font-semibold text-lg">Coming Soon</div>
                <p className="text-sm text-slate-300">DBForge is currently in alpha development. Public release coming soon.</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Alpha v0.1 · Self-hosted database management
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-1 rounded-full border border-slate-700 bg-slate-900/30">Unified API for PostgreSQL · MySQL · MongoDB · Redis</div>
                  <div className="px-4 py-1 rounded-full border border-slate-700 bg-slate-900/30">UI Kit for React · Vue · Svelte · Angular</div>
                </div>

                <div className="text-slate-400 mt-1">What you get:</div>
                <div className="flex flex-wrap gap-3">
                  {["Container orchestration", "Connection management", "Instance lifecycle", "Resource limits", "Health monitoring"].map((feature) => (
                    <div key={feature} className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/30 text-xs">
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-cyan-500/10 blur-[120px] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 0.1,
            transition: { duration: 1.5, ease: "easeOut" }
          }}
        />
      </div>

      <AnimatedSection className="w-full flex justify-center px-6 pb-28">
        <div className="w-full max-w-6xl grid md:grid-cols-3 gap-8">
          {[
            { title: "Multi-database support", desc: "Create PostgreSQL, MySQL, MariaDB, MongoDB, and Redis instances instantly.", icon: Layers },
            { title: "Docker powered", desc: "Automatic container provisioning, lifecycle management, and health monitoring.", icon: Zap },
            { title: "Modern interface", desc: "Beautiful, responsive UI with real-time status and connection management.", icon: Shield },
          ].map((b) => (
            <motion.div 
              key={b.title}
              variants={item}
              whileHover={{ y: -8, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="p-6 rounded-xl border border-slate-700 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-800/40 transition-all group"
            >
              <b.icon className="w-8 h-8 mb-3 text-cyan-400 group-hover:text-green-400 transition-colors" />
              <div className="font-semibold text-lg mb-2 text-slate-100">{b.title}</div>
              <div className="text-sm text-slate-400">{b.desc}</div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {!scrolled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.8, y: 0, transition: { delay: 1, duration: 0.6 } }}
          exit={{ opacity: 0, y: 10 }}
          className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center text-slate-400/80">
            <svg width="26" height="40" viewBox="0 0 26 40" fill="none">
              <rect x="1" y="1" width="24" height="38" rx="12" stroke="rgba(148,163,184,0.6)" strokeWidth="2"/>
              <circle cx="13" cy="10" r="2" fill="rgba(148,163,184,0.8)">
                <animate attributeName="cy" values="10;14;10" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" className="mt-1">
              <path d="M6 9l6 6 6-6" stroke="rgba(148,163,184,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>
      )}



      <AnimatedSection className="w-full flex justify-center px-6 py-20">
        <div className="w-full max-w-6xl grid md:grid-cols-3 gap-6">
          {[
            { t: "Development environments", d: "Spin up isolated database instances for each project or feature branch." },
            { t: "Testing & staging", d: "Create temporary databases for integration tests and QA environments." },
            { t: "Local development", d: "Self-host your entire database infrastructure with Docker containers." },
          ].map((c) => (
            <motion.div 
              key={c.t}
              variants={item}
              whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 transition-all"
            >
              <div className="font-semibold text-slate-100 mb-1">{c.t}</div>
              <div className="text-sm text-slate-400">{c.d}</div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>



      <AnimatedSection className="w-full flex justify-center px-6 py-16">
        <div className="w-full max-w-3xl space-y-4">
          {[
            { q: "What databases are supported?", a: "PostgreSQL 17, MySQL 9.1, MariaDB 11.5, MongoDB 8.0, and Redis 7.4 with automatic image pulling." },
            { q: "How does it work?", a: "DBForge uses Docker containers to provision isolated database instances with automatic port management and resource limits." },
            { q: "Is authentication included?", a: "Yes. User authentication with JWT tokens is built-in, with per-user database isolation." },
          ].map((f) => (
            <motion.div 
              key={f.q}
              variants={item}
              whileHover={{ x: 5 }}
              className="p-4 rounded-lg border border-slate-800 bg-slate-900/50 cursor-default"
            >
              <div className="font-medium text-slate-100">{f.q}</div>
              <div className="text-sm text-slate-400 mt-1">{f.a}</div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="w-full flex justify-center px-6 pb-20 -mt-4">
        <motion.div 
          variants={item}
          whileHover={{ scale: 1.02 }}
          className="w-full max-w-xl p-6 rounded-2xl border border-slate-800 bg-slate-900/60 text-center shadow-2xl"
        >
          <div className="text-lg font-semibold text-slate-100 mb-2">Ready to get started?</div>
          <div className="text-sm text-slate-400 mb-4">Create your account and start managing databases in seconds.</div>
          <button 
            onClick={onGetStarted}
            className="inline-block px-6 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-400 to-cyan-400 text-slate-900 shadow-lg hover:brightness-110 transition"
          >
            Get started →
          </button>
        </motion.div>
      </AnimatedSection>

      <AnimatedSection className="w-full flex justify-center px-6 pt-10 pb-10">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6">
          {[
            {
              title: "Create Database",
              language: "HTTP",
              code: `# Create a new PostgreSQL instance\ncurl -X POST http://localhost:8080/api/databases \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "databaseType": "postgres",\n    "instanceName": "my-app-db"\n  }'`
            },
            {
              title: "List Databases",
              language: "HTTP",
              code: `# Get all your database instances\ncurl http://localhost:8080/api/databases \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
            },
            {
              title: "Get Connection",
              language: "HTTP",
              code: `# Get connection details for a database\ncurl http://localhost:8080/api/databases/1/connection \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"\n\n# Returns: host, port, database, username, password`
            },
            {
              title: "Manage Instance",
              language: "HTTP",
              code: `# Start a stopped database\ncurl -X POST http://localhost:8080/api/databases/1/start \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"\n\n# Stop a running database\ncurl -X POST http://localhost:8080/api/databases/1/stop \\\n  -H "Authorization: Bearer YOUR_JWT_TOKEN"`
            }
          ].map((snippet) => (
            <motion.div
              key={snippet.title}
              variants={item}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-xl backdrop-blur-xl"
            >
              <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="w-2 h-2 bg-yellow-300 rounded-full" />
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                  </span>
                  {`API · ${snippet.title}`}
                </div>
                <div className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/30">{snippet.language}</div>
              </div>
              <pre className="bg-[#070b16] border border-blue-900/30 text-[13px] text-slate-100 p-4 rounded-lg overflow-auto max-h-72 leading-[1.55]">
                {snippet.code}
              </pre>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="w-full flex justify-center px-6 py-36">
        <div className="w-full max-w-6xl grid md:grid-cols-3 gap-8">
          {[
            { title: "Multi-database", desc: "PostgreSQL, MySQL, MariaDB, MongoDB, Redis support." },
            { title: "User authentication", desc: "JWT-based auth with per-user database isolation." },
            { title: "Docker powered", desc: "Automatic container orchestration and management." },
            { title: "Resource controls", desc: "CPU and memory limits per container instance." },
            { title: "Modern UI", desc: "Beautiful React interface with real-time status." },
            { title: "Self-hosted", desc: "Run on your own infrastructure with full control." },
          ].map((f, i) => (
            <motion.div 
              key={i}
              variants={item}
              whileHover={{ y: -5, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="p-6 rounded-xl border border-slate-700 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-800/40 transition-all"
            >
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                {String(i + 1).padStart(2, "0")} · Feature
              </div>
              <div className="font-semibold text-lg mb-1 text-slate-100">{f.title}</div>
              <div className="text-sm text-slate-400">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      <footer className="w-full px-6 py-16 border-t border-slate-800 bg-[#03050a] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="w-full max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/dbforge-logo.png" alt="DBForge" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-slate-200">DBForge</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Self-hosted database management platform. Create and manage multiple database instances through a modern web interface.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-cyan-400 transition">Features</a></li>
                <li><a href="#docs" className="hover:text-cyan-400 transition">Documentation</a></li>
                <li><a href="#pricing" className="hover:text-cyan-400 transition">Pricing</a></li>
                <li><a href="#changelog" className="hover:text-cyan-400 transition">Changelog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#guides" className="hover:text-cyan-400 transition">Guides</a></li>
                <li><a href="#api" className="hover:text-cyan-400 transition">API Reference</a></li>
                <li><a href="#blog" className="hover:text-cyan-400 transition">Blog</a></li>
                <li><a href="#status" className="hover:text-cyan-400 transition">Status</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-200 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#about" className="hover:text-cyan-400 transition">About</a></li>
                <li><a href="mailto:dev@dbforge.dev" className="hover:text-cyan-400 transition flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Contact
                </a></li>
                <li><a href="#privacy" className="hover:text-cyan-400 transition">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-cyan-400 transition">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <div className="flex flex-wrap gap-4 items-center">
              <span>© 2025 DBForge. All rights reserved.</span>
              <span>·</span>
              <span>Self-hosted · Docker powered · Open source</span>
            </div>
            <div className="flex gap-3">
              <span className="border border-slate-700 px-3 py-1 rounded-full bg-slate-900/50">
                Alpha v0.1
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
