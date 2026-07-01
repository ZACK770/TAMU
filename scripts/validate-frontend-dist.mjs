import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../frontend/dist');
const indexPath = path.join(distPath, 'index.html');
const forbiddenPatterns = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://localhost:5179',
  'https://localhost:8080',
  'https://localhost:8081',
  'https://localhost:5173',
  'https://localhost:5179',
  'VITE_API_URL',
];

if (!fs.existsSync(indexPath)) {
  throw new Error(`Frontend build is missing: ${indexPath}`);
}

const files = fs.readdirSync(distPath, { recursive: true })
  .map((entry) => path.join(distPath, entry.toString()))
  .filter((filePath) => fs.statSync(filePath).isFile())
  .filter((filePath) => /\.(html|js|css|map)$/.test(filePath));

const violations = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of forbiddenPatterns) {
    if (content.includes(pattern)) {
      violations.push(`${filePath}: ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Frontend dist contains forbidden absolute API references:\n${violations.join('\n')}`);
}
