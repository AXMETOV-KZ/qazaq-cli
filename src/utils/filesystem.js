import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import chalk from 'chalk';

const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh',
  '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.sql', '.html',
  '.css', '.scss', '.less', '.json', '.yaml', '.yml', '.toml', '.xml',
  '.md', '.txt', '.env', '.gitignore', '.dockerignore', '.dockerfile',
]);

export function readFileSafe(filePath) {
  try {
    if (!existsSync(filePath)) {
      return { error: `Файл табылмады: ${filePath}` };
    }
    const content = readFileSync(filePath, 'utf-8');
    const ext = extname(filePath);
    const isCode = CODE_EXTENSIONS.has(ext);
    return { content, ext, isCode, path: filePath };
  } catch (e) {
    return { error: `Оқу қатесі ${filePath}: ${e.message}` };
  }
}

export function writeFileSafe(filePath, content) {
  try {
    writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (e) {
    return { error: `Жазу қатесі ${filePath}: ${e.message}` };
  }
}

export function listDir(dirPath = '.', maxDepth = 2) {
  const results = [];

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = join(dir, entry.name);
        const relPath = relative('.', fullPath);

        if (entry.isDirectory()) {
          results.push({ type: 'dir', path: relPath });
          walk(fullPath, depth + 1);
        } else {
          const ext = extname(entry.name);
          results.push({
            type: 'file',
            path: relPath,
            ext,
            isCode: CODE_EXTENSIONS.has(ext),
            size: statSync(fullPath).size,
          });
        }
      }
    } catch {}
  }

  walk(dirPath, 0);
  return results;
}

export function formatFileContent(result) {
  if (result.error) return chalk.red(result.error);
  const lines = result.content.split('\n');
  const numbered = lines.map((l, i) => chalk.gray(`${i + 1}:`) + ' ' + l).join('\n');
  return chalk.cyan(`── ${result.path} (${lines.length} жол) ──\n`) + numbered;
}

export function formatDirList(entries) {
  if (entries.length === 0) return chalk.gray('Папка бос');
  return entries.map(e => {
    const icon = e.type === 'dir' ? chalk.blue('📁') : (e.isCode ? chalk.green('📄') : chalk.gray('📄'));
    return `${icon} ${e.path}`;
  }).join('\n');
}
