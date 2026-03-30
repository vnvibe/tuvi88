const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toLocaleTimeString('vi-VN');
}

export const logger = {
  info: (msg: string) => console.log(`${colors.cyan}[${timestamp()}] ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}[${timestamp()}] ✓ ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}[${timestamp()}] ⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.error(`${colors.red}[${timestamp()}] ✗ ${msg}${colors.reset}`),
  bot: (msg: string) => console.log(`${colors.magenta}[${timestamp()}] 🤖 ${msg}${colors.reset}`),
  ai: (msg: string) => console.log(`${colors.blue}[${timestamp()}] 🧠 ${msg}${colors.reset}`),
};
