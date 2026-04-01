#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const errors: string[] = [];
const warnings: string[] = [];

const REQUIRED_FILES = [
  'AGENTS.md',
  '.ai/README.md',
  '.ai/global/rules/00-governance.md',
];

const REQUIRED_AGENTS_SNIPPETS = [
  '.ai/global/rules/*.md',
  '.ai/local/rules/*.md',
  '.ai/global/skills/*/SKILL.md',
  '.ai/local/skills/*/SKILL.md',
];

const LOCAL_ALLOWED_TRACKED = new Set([
  '.ai/local/rules/.gitkeep',
  '.ai/local/skills/.gitkeep',
]);

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function addError(message: string): void {
  errors.push(message);
}

// Check required files exist
for (const relPath of REQUIRED_FILES) {
  if (!fileExists(relPath)) {
    addError(`Missing required file: ${relPath}`);
  }
}

// Check AGENTS.md contains required snippets
if (fileExists('AGENTS.md')) {
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  for (const snippet of REQUIRED_AGENTS_SNIPPETS) {
    if (!agents.includes(snippet)) {
      addError(`AGENTS.md must contain bootstrap snippet: ${snippet}`);
    }
  }
}

// Check for version-gated rules
const rulesDir = path.join(ROOT, '.ai/global/rules');
if (fs.existsSync(rulesDir)) {
  const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
  for (const file of ruleFiles) {
    const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
    const markers = (content.match(/^\s*-\s*\[VERSION-GATED\]/gm) ?? []).length;
    if (markers > 0) {
      warnings.push(`Version-gated rules in ${file}: ${markers} marker(s)`);
    }
  }
}

// Check no local files are tracked (except .gitkeep)
try {
  const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  for (const file of tracked) {
    if (file.startsWith('.ai/local/') && !LOCAL_ALLOWED_TRACKED.has(file)) {
      addError(`Tracked local AI file not allowed: ${file}`);
    }
  }
} catch (error) {
  // Git not available or not a git repo - skip check
}

if (errors.length > 0) {
  console.error('AI config check failed:');
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
}

warnings.forEach(w => console.warn(`Warning: ${w}`));
console.log('AI config check passed.');
