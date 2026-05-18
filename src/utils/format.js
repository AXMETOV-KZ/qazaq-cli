import chalk from 'chalk';

export function formatResponse(text) {
  return chalk.cyan('\n' + text + '\n');
}

export function formatError(text) {
  return chalk.red('\n✖ ' + text + '\n');
}

export function formatInfo(text) {
  return chalk.gray('ℹ ' + text);
}

export function formatProvider(name, model) {
  return chalk.gray(`[${name}] ${model}`);
}

export function formatThinking() {
  return chalk.gray('Ойланып жатыр...');
}
