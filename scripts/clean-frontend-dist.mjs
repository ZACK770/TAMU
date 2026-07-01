import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../frontend/dist');

if (process.platform === 'win32') {
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `if (Test-Path -LiteralPath '${distPath.replaceAll("'", "''")}') { Remove-Item -LiteralPath '${distPath.replaceAll("'", "''")}' -Recurse -Force }`,
  ], { stdio: 'inherit' });
} else {
  fs.rmSync(distPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

if (fs.existsSync(distPath)) {
  const remainingFiles = fs.readdirSync(distPath, { recursive: true }).map((entry) => path.join(distPath, entry.toString()));
  throw new Error(`Failed to clean frontend dist. Remaining files: ${remainingFiles.join(', ')}`);
}
