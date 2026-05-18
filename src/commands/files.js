import chalk from 'chalk';
import ora from 'ora';
import { readFileSafe, writeFileSafe, listDir, formatFileContent, formatDirList } from '../utils/filesystem.js';
import { getClient } from '../providers/index.js';

export async function readFileCommand(filePath) {
  const result = readFileSafe(filePath);
  console.log(formatFileContent(result));
}

export async function listDirCommand(dirPath) {
  const entries = listDir(dirPath || '.');
  console.log(formatDirList(entries));
}

export async function writeFileCommand(filePath, content) {
  const result = writeFileSafe(filePath, content);
  if (result.success) {
    console.log(chalk.green(`✔ Файл жазылды: ${filePath}`));
  } else {
    console.log(chalk.red(result.error));
  }
}

export async function fixFileCommand(filePath, options) {
  const fileResult = readFileSafe(filePath);
  if (fileResult.error) {
    console.log(chalk.red(fileResult.error));
    return;
  }

  const spinner = ora('Кодты талдау...').start();

  try {
    const { client, info } = getClient(options.provider);
    const model = options.model || info.defaultModel;

    const prompt = `Сен тәжірибелі бағдарламашысың. Мына кодты талдап, қателер, багтар не жақсартулар тап.
ТҮЗЕТІЛГЕН кодты толығымен қайтар, түсіндірмесіз. Қателер болмаса — кодты сол қалпында қайтар.

Файл: ${filePath}
\`\`\`
${fileResult.content}
\`\`\``;

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Сен кодты түзету маманысың. Тек түзетілген кодты қайтар.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4096,
    });

    spinner.stop();

    const msg = response.choices[0]?.message;
    const answer = msg?.content || msg?.reasoning_content || '';

    // Извлекаем код из ответа
    const codeMatch = answer.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const fixedCode = codeMatch ? codeMatch[1].trim() : answer.trim();

    if (!fixedCode) {
      console.log(chalk.yellow('AI кодты талдай алмады'));
      return;
    }

    // Показываем diff
    const originalLines = fileResult.content.split('\n');
    const fixedLines = fixedCode.split('\n');

    console.log(chalk.bold('\n📋 Файл талдауы: ') + chalk.cyan(filePath));
    console.log(chalk.gray(`Жолдар: ${originalLines.length} → ${fixedLines.length}`));

    if (fixedCode === fileResult.content) {
      console.log(chalk.green('\n✔ Қателер табылмады!'));
      return;
    }

    // Показываем первые 20 строк исправленного кода
    console.log(chalk.bold('\n📝 Түзетілген код (алғашқы 20 жол):'));
    fixedLines.slice(0, 20).forEach((line, i) => {
      console.log(chalk.gray(`${i + 1}:`) + ' ' + line);
    });
    if (fixedLines.length > 20) {
      console.log(chalk.gray(`... және тағы ${fixedLines.length - 20} жол`));
    }

    console.log(chalk.yellow('\n💡 Түзетулерді жазу үшін:'));
    console.log(chalk.gray(`   qazaq write ${filePath} "мазмұны"`));

  } catch (error) {
    spinner.stop();
    console.log(chalk.red('\n✖ ' + error.message));

    if (error.message.includes('terminated') || error.message.includes('ECONNRESET')) {
      console.log(chalk.yellow('💡 Байланыс үзілді. Қайта көріңіз.'));
    }
  }
}

export async function explainFileCommand(filePath, options) {
  const fileResult = readFileSafe(filePath);
  if (fileResult.error) {
    console.log(chalk.red(fileResult.error));
    return;
  }

  const spinner = ora('Кодты талдау...').start();

  try {
    const { client, info } = getClient(options.provider);
    const model = options.model || info.defaultModel;

    const prompt = `Мына кодты қарапайым тілмен түсіндір. Ол не істейді? Негізгі сәттері қандай?
Қысқа, тармақтап жауап бер.

Файл: ${filePath}
\`\`\`
${fileResult.content}
\`\`\``;

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Сен бағдарламалау маманысың. Кодты қарапайым әрі түсінікті түсіндір.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048,
    });

    spinner.stop();

    const msg = response.choices[0]?.message;
    const answer = msg?.content || msg?.reasoning_content || 'Талдау мүмкін болмады';

    console.log(chalk.bold('\n📖 Түсіндірме: ') + chalk.cyan(filePath));
    console.log(chalk.cyan('\n' + answer + '\n'));

  } catch (error) {
    spinner.stop();
    console.log(chalk.red('\n✖ ' + error.message));
  }
}
