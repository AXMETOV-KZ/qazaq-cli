#!/usr/bin/env node

const args = process.argv.slice(2);

// Если нет аргументов — запускаем TUI чат
if (args.length === 0) {
  await import('../src/tui/run.js');
}
// Иначе — обычный режим с командами
else {
  await import('../src/index.js');
}
