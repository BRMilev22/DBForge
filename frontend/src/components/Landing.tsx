import { useEffect, useState, useRef, useMemo } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Terminal, Cpu, Globe, Zap, Shield, Layers, Code2, Box, ArrowRight } from "lucide-react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
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

  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesLoaded(true);
    });
  }, []);

  const particlesOptions = useMemo(() => ({
    background: {
      color: { value: "transparent" },
    },
    fpsLimit: 120,
    particles: {
      color: { value: ["#a855f7", "#d946ef", "#8b5cf6"] },
      links: {
        color: "#a855f7",
        distance: 150,
        enable: true,
        opacity: 0.1,
        width: 1,
      },
      move: {
        enable: true,
        direction: "none" as const,
        outModes: { default: "bounce" as const },
        random: true,
        speed: 0.8,
        straight: false,
      },
      number: { value: 60 },
      opacity: { value: { min: 0.1, max: 0.3 } },
      shape: { type: "circle" },
      size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  }), []);

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={targetRef} className="relative w-full min-h-screen overflow-x-hidden flex flex-col items-center text-slate-200 bg-[#030014] font-sans selection:bg-purple-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        {particlesLoaded && (
          <Particles id="tsparticles" options={particlesOptions} className="absolute inset-0" />
        )}
        
        <motion.div 
          className="absolute inset-0 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.03]"
          style={{ scale: backgroundScale }}
        />
        
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-purple-600/20 blur-[120px] rounded-full opacity-40" />
        <div className="absolute bottom-[-20%] right-0 w-[800px] h-[800px] bg-fuchsia-600/10 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#030014]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/dbforge-logo.png" alt="DBForge" className="w-8 h-8 rounded-lg shadow-lg shadow-purple-500/20" />
            <span className="font-bold text-lg tracking-tight">DBForge</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/BRMilev22/DBForge" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">GitHub</a>
            <button onClick={onGetStarted} className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 w-full max-w-7xl flex flex-col items-center text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          v1.0 Now Available
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/60"
        >
          The Database Platform <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 animate-gradient-x">
            for Modern Developers
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed"
        >
          Instant database provisioning with a unified SDK for Python and TypeScript. 
          Build faster with type-safe access, automatic container management, and zero-config connections.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <button 
            onClick={onGetStarted}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
          <a 
            href="https://github.com/BRMilev22/DBForge"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
          >
            View on GitHub
          </a>
        </motion.div>
      </section>

      {/* Code Cards Section */}
      <AnimatedSection className="w-full max-w-7xl px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold">
              Write less code. <br />
              <span className="text-purple-400">Ship faster.</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Stop wrestling with connection strings and drivers. Our unified Framework provides a consistent, type-safe API for all supported databases.
            </p>
            
            <div className="space-y-4">
              {[
                { icon: Terminal, title: "Unified SDK", desc: "One API for Postgres, MySQL, Redis, and Mongo." },
                { icon: Shield, title: "Type Safety", desc: "Full TypeScript and Python type hinting support." },
                { icon: Zap, title: "Instant Connect", desc: "Zero-config connection via API tokens." },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Gradient Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-fuchsia-500/30 blur-3xl rounded-full opacity-20" />
            
            {/* Code Window */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0e0e11]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="ml-4 flex gap-4 text-xs font-medium text-slate-500">
                  <span className="text-purple-400">app.py</span>
                  <span>main.ts</span>
                </div>
              </div>
              
              <div className="p-6 font-mono text-sm overflow-x-auto">
                <div className="text-slate-300 leading-relaxed">
                  <div className="flex"><span className="text-purple-400 w-8">1</span><span className="text-pink-400">from</span><span className="text-white ml-2">dbforge_framework</span><span className="text-pink-400 ml-2">import</span><span className="text-yellow-200 ml-2">DbForgeClient</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">2</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">3</span><span className="text-slate-500"># Initialize with API Token</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">4</span><span className="text-blue-300">client</span><span className="text-white ml-2">=</span><span className="text-yellow-200 ml-2">DbForgeClient</span><span className="text-white">.</span><span className="text-blue-400">from_api_token</span><span className="text-white">(</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">5</span><span className="ml-4 text-green-400">"dfg_live_8923..."</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">6</span><span className="text-white">)</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">7</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">8</span><span className="text-slate-500"># Type-safe queries across databases</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">9</span><span className="text-blue-300">users</span><span className="text-white ml-2">=</span><span className="text-blue-300 ml-2">client</span><span className="text-white">.</span><span className="text-blue-400">select</span><span className="text-white">(</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">10</span><span className="ml-4 text-green-400">"users"</span><span className="text-white">,</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">11</span><span className="ml-4 text-white">where={'{'}</span><span className="text-green-400">"active"</span><span className="text-white">:</span><span className="text-purple-400 ml-2">True</span><span className="text-white">{'}'}</span></div>
                  <div className="flex"><span className="text-purple-400 w-8">12</span><span className="text-white">)</span></div>
                </div>
              </div>
            </div>
            
            {/* Floating Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-6 -right-6 p-4 rounded-xl bg-[#1a1b26] border border-purple-500/30 shadow-xl shadow-purple-900/20 max-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-400">Connected</span>
              </div>
              <div className="text-xs text-slate-400">Latency: <span className="text-white">24ms</span></div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Features Grid */}
      <AnimatedSection className="w-full max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Powering your infrastructure</h2>
          <p className="text-slate-400">Everything you need to build scalable applications.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Globe,
              title: "Polyglot Persistence",
              desc: "Support for PostgreSQL, MySQL, MariaDB, MongoDB, and Redis out of the box."
            },
            {
              icon: Box,
              title: "Docker Native",
              desc: "Each database runs in its own isolated container with resource limits and health checks."
            },
            {
              icon: Code2,
              title: "Framework Agnostic",
              desc: "Use our SDKs with Django, FastAPI, Express, NestJS, or any other framework."
            },
            {
              icon: Layers,
              title: "Environment Management",
              desc: "Easily clone production databases for development or testing environments."
            },
            {
              icon: Shield,
              title: "Secure by Default",
              desc: "Built-in JWT authentication, role-based access, and encrypted credentials."
            },
            {
              icon: Cpu,
              title: "Resource Analytics",
              desc: "Real-time monitoring of CPU, memory, and storage usage for all instances."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={item}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="w-full px-6 pb-24">
        <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-purple-900/20 to-fuchsia-900/20 border border-purple-500/20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-purple-500/10 to-transparent blur-3xl pointer-events-none" />
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Ready to forge your database?</h2>
          <p className="text-slate-400 mb-8 relative z-10 max-w-lg mx-auto">
            Join developers building the next generation of applications with DBForge.
          </p>
          <button 
            onClick={onGetStarted}
            className="relative z-10 px-8 py-3 rounded-full bg-white text-purple-950 font-bold hover:bg-slate-100 transition-colors shadow-lg hover:shadow-xl hover:shadow-white/20"
          >
            Create Database Now
          </button>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 bg-[#020205] pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/dbforge-logo.png" alt="DBForge" className="w-6 h-6 rounded-lg" />
                <span className="font-bold text-white">DBForge</span>
              </div>
              <p className="text-sm text-slate-500">
                The modern database platform for developers.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-purple-400 transition">Features</a></li>
                <li><a href="https://github.com/BRMilev22/DBForge/tree/main/docs" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Frameworks</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="https://github.com/BRMilev22/DBForge/tree/main/framework-py" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">Python SDK</a></li>
                <li><a href="https://github.com/BRMilev22/DBForge/tree/main/framework" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">TypeScript SDK</a></li>
                <li><a href="https://github.com/BRMilev22/DBForge" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">REST API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="https://github.com/BRMilev22/DBForge" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© 2025 DBForge. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Forged with <span className="text-red-500 animate-pulse">❤️</span> for 
              <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent font-semibold">builders</span>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
