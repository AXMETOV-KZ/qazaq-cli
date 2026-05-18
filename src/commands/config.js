import chalk from 'chalk';
import { saveConfig, loadConfig, getConfigValue } from '../utils/config.js';

export async function configCommand(options) {
  if (options.set) {
    const [key, ...valueParts] = options.set.split('=');
    const value = valueParts.join('=');

    if (!key || !value) {
      console.log(chalk.red('Формат: --set key=value'));
      process.exit(1);
    }

    saveConfig({ [key]: value });
    console.log(chalk.green(`✔ ${key} = ${value}`));
    return;
  }

  if (options.get) {
    const value = getConfigValue(options.get);
    if (value) {
      console.log(`${options.get} = ${value}`);
    } else {
      console.log(chalk.gray(`${options.get} орнатылмаған`));
    }
    return;
  }

  if (options.list) {
    const cfg = loadConfig();
    const keys = Object.keys(cfg);

    if (keys.length === 0) {
      console.log(chalk.gray('Баптаулар жоқ'));
      return;
    }

    console.log(chalk.bold('\nQazaq CLI баптаулары:\n'));
    for (const key of keys) {
      console.log(`  ${chalk.cyan(key)} = ${cfg[key]}`);
    }
    console.log();
    return;
  }

  console.log(chalk.bold('\nҚолдану:'));
  console.log('  qazaq config --list              Барлық баптауларды көрсету');
  console.log('  qazaq config --get <key>         Мәнді алу');
  console.log('  qazaq config --set <key=value>   Мәнді орнату');
  console.log(chalk.gray('\nҚол жетімді кілттер:'));
  console.log('  provider     Провайдер: gateway | mimo');
  console.log('  mimoApiKey   Xiaomi MiMo API-кілті');
  console.log();
}
