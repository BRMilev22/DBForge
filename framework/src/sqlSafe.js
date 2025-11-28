export function validateSqlSafe(sql) {
  const unsafe = [
    /;\s*drop\s/i,
    /;\s*delete\s/i,
    /;\s*truncate\s/i,
    /--/g,
    /\/\*/g,
    /\*\//g,
    /\bshutdown\b/i,
    /\bcreate\b/i,
    /\balter\b/i,
    /\bgrant\b/i,
    /\brevoke\b/i
  ];

  for (const pattern of unsafe) {
    if (pattern.test(sql)) {
      throw new Error(`Unsafe SQL detected: ${sql}`);
    }
  }
}
