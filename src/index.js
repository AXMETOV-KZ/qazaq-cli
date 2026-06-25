import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env') });

const program = new Command();

program
  .name('qazaq')
  .description('Qazaq CLI — файлдарға қол жетімді AI-көмекші')
  .version('1.3.0');

// === TUI режимі ===
program
  .command('tui')
  .description('Әдемі TUI мәзірін іске қосу')
  .action(async () => {
    await import('./tui/run.js');
  });

// === AI командалары ===
program
  .command('ask')
  .description('AI-ға сұрақ қою')
  .argument('<question>', 'Сұрағыңыз')
  .option('-p, --provider <provider>', 'Провайдер', process.env.QAZAQ_PROVIDER)
  .option('-m, --model <model>', 'AI моделі', process.env.QAZAQ_MODEL)
  .action(async (question, options) => {
    const { askCommand } = await import('./commands/ask.js');
    await askCommand(question, options);
  });

program
  .command('chat')
  .description('AI-мен интерактивті сөйлесу')
  .option('-p, --provider <provider>', 'Провайдер', process.env.QAZAQ_PROVIDER)
  .option('-m, --model <model>', 'AI моделі', process.env.QAZAQ_MODEL)
  .action(async (options) => {
    const { chatCommand } = await import('./commands/chat.js');
    await chatCommand(options);
  });

// === Файл жүйесі ===
program
  .command('read')
  .description('Файлды оқу')
  .argument('<path>', 'Файл жолы')
  .action(async (filePath) => {
    const { readFileCommand } = await import('./commands/files.js');
    await readFileCommand(filePath);
  });

program
  .command('ls')
  .description('Папкадағы файлдарды көрсету')
  .argument('[path]', 'Папка жолы', '.')
  .action(async (dirPath) => {
    const { listDirCommand } = await import('./commands/files.js');
    await listDirCommand(dirPath);
  });

program
  .command('write')
  .description('Файлға жазу')
  .argument('<path>', 'Файл жолы')
  .argument('<content>', 'Мазмұны')
  .action(async (filePath, content) => {
    const { writeFileCommand } = await import('./commands/files.js');
    await writeFileCommand(filePath, content);
  });

program
  .command('fix')
  .description('AI кодты талдап, түзетеді')
  .argument('<path>', 'Файл жолы')
  .option('-p, --provider <provider>', 'Провайдер', process.env.QAZAQ_PROVIDER)
  .option('-m, --model <model>', 'AI моделі', process.env.QAZAQ_MODEL)
  .action(async (filePath, options) => {
    const { fixFileCommand } = await import('./commands/files.js');
    await fixFileCommand(filePath, options);
  });

program
  .command('explain')
  .description('AI кодты түсіндіреді')
  .argument('<path>', 'Файл жолы')
  .option('-p, --provider <provider>', 'Провайдер', process.env.QAZAQ_PROVIDER)
  .option('-m, --model <model>', 'AI моделі', process.env.QAZAQ_MODEL)
  .action(async (filePath, options) => {
    const { explainFileCommand } = await import('./commands/files.js');
    await explainFileCommand(filePath, options);
  });

// === AI Agent ===
program
  .command('agent')
  .description('AI agent — aspaptar men jumys istetedi')
  .argument('[question]', 'Tapsyrma nemese suraq')
  .option('-p, --provider <provider>', 'Provider', process.env.QAZAQ_PROVIDER)
  .option('-m, --model <model>', 'AI modeli', process.env.QAZAQ_MODEL)
  .action(async (question, options) => {
    const { agentCommand } = await import('./commands/agent.js');
    await agentCommand(question, options);
  });

// === Baptaular ===
program
  .command('config')
  .description('Baptaulardy basqaru')
  .option('-s, --set <key=value>', 'Mándi ornatý')
  .option('-g, --get <key>', 'Mándi alý')
  .option('-l, --list', 'Barlyq baptaulardy kórsetu')
  .action(async (options) => {
    const { configCommand } = await import('./commands/config.js');
    await configCommand(options);
  });

// === Jaña nusqany tekserý ===
program
  .command('update')
  .description('Jaña nusqany tekserý (npm)')
  .action(async () => {
    const { checkForUpdate } = await import('./utils/update.js');
    const r = await checkForUpdate();
    if (r.error) {
      console.log(chalk.gray(` Teksere almadyq: ${r.error}`));
      return;
    }
    if (r.hasUpdate) {
      console.log(chalk.yellow(` Jaña nusqa bar: ${r.current} → ${r.latest}`));
      console.log(chalk.cyan(' Jańartý: npm install -g qazaq-cli'));
    } else {
      console.log(chalk.green(` Eń soñǵy nusqa ornatylǵan (${r.current}).`));
    }
  });

program.parse();
