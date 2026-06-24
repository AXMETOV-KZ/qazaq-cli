import chalk from 'chalk';
import { saveConfig, loadConfig, getConfigValue } from '../utils/config.js';
import { listProviders, DEFAULT_PROVIDER } from '../providers/index.js';

export async function configCommand(options) {
	if (options.set) {
		const [key, ...valueParts] = options.set.split('=');
		const value = valueParts.join('=');
		if (!key || !value) {
			console.log(chalk.red('Формат: --set key=value'));
			process.exit(1);
		}
		saveConfig({ [key]: value });
		console.log(chalk.green(`✔ ${key} = ${/key/i.test(key) ? maskKey(value) : value}`));
		return;
	}

	if (options.get) {
		const value = getConfigValue(options.get);
		if (value) console.log(`${options.get} = ${value}`);
		else console.log(chalk.gray(`${options.get} орнатылмаған`));
		return;
	}

	if (options.list) {
		const cfg = loadConfig();
		const keys = Object.keys(cfg);
		if (keys.length === 0) {
			console.log(chalk.gray('Бапталмаған'));
			return;
		}
		console.log(chalk.bold('\nQazaq CLI баптаулары:\n'));
		for (const key of keys) {
			const shown = /key/i.test(key) ? maskKey(cfg[key]) : cfg[key];
			console.log(`  ${chalk.cyan(key)} = ${shown}`);
		}
		console.log();
		return;
	}

	// Анықтама
	console.log(chalk.bold('\nҚолдану:'));
	console.log('  qazaq config --list              Барлық баптауларды көрсету');
	console.log('  qazaq config --get <key>         Мәнді алу');
	console.log('  qazaq config --set <key=value>   Мәнді орнату');

	console.log(chalk.bold('\nПровайдерлер (api key арқылы):'));
	for (const p of listProviders()) {
		const def = p.id === DEFAULT_PROVIDER ? chalk.green(' (default)') : '';
		console.log(`  ${chalk.cyan(p.id.padEnd(11))} ${p.name}${def}`);
	}

	console.log(chalk.bold('\nМысал:'));
	console.log(chalk.gray('  qazaq config --set provider=openai'));
	console.log(chalk.gray('  qazaq config --set openai.apiKey=sk-...'));
	console.log(chalk.gray('  qazaq config --set openai.model=gpt-4o'));
	console.log(chalk.gray('  # немесе env: export OPENAI_API_KEY=sk-...'));
	console.log();
}

function maskKey(v) {
	if (!v || typeof v !== 'string' || v.length < 8) return '****';
	return v.slice(0, 4) + '...' + v.slice(-4);
}
