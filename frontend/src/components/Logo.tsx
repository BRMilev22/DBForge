export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      
      {/* Database stack */}
      <ellipse cx="50" cy="30" rx="35" ry="12" fill="url(#logoGradient)" opacity="0.9"/>
      <path d="M 15 30 L 15 45 Q 15 52 50 52 Q 85 52 85 45 L 85 30" fill="url(#logoGradient)" opacity="0.8"/>
      <ellipse cx="50" cy="45" rx="35" ry="7" fill="url(#logoGradient)" opacity="0.9"/>
      
      <path d="M 15 45 L 15 60 Q 15 67 50 67 Q 85 67 85 60 L 85 45" fill="url(#logoGradient)" opacity="0.7"/>
      <ellipse cx="50" cy="60" rx="35" ry="7" fill="url(#logoGradient)" opacity="0.9"/>
      
      {/* Forge hammer */}
      <rect x="60" y="55" width="8" height="30" rx="2" fill="#1e293b"/>
      <path d="M 55 50 L 73 50 L 75 58 L 53 58 Z" fill="#334155"/>
      <circle cx="64" cy="47" r="4" fill="#475569"/>
    </svg>
  );
}
