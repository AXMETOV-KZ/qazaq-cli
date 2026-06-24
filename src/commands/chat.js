import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getClient } from '../providers/index.js';
import { formatResponse, formatError, formatProvider } from '../utils/format.js';

export async function chatCommand(options) {
  let client, info, model;

  try {
    const result = getClient(options.provider);
    client = result.client;
    info = result.info;
    model = options.model || info.defaultModel;
  } catch (error) {
    console.log(formatError(error.message));
    process.exit(1);
  }

  const messages = [
    { role: 'system', content: 'Сен пайдалы AI-көмекшісің. Қысқа әрі нақты жауап бер.' }
  ];

  console.log(chalk.bold('\n🤖 Qazaq Chat'));
  console.log(formatProvider(info.name, model));
  console.log(chalk.gray('Шығу үшін "exit" не "quit" жазыңыз\n'));

  let consecutiveErrors = 0;

  while (true) {
    let userInput;
    try {
      const result = await inquirer.prompt([{
        type: 'input',
        name: 'userInput',
        message: chalk.green('Сіз:'),
      }]);
      userInput = result.userInput;
    } catch {
      console.log(chalk.gray('\nКездескенше!\n'));
      break;
    }

    const input = userInput.trim();

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.gray('\nКездескенше!\n'));
      break;
    }

    if (!input) continue;

    messages.push({ role: 'user', content: input });

    const spinner = ora('Ойланып жатыр...').start();

    try {
      const response = await client.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 2048,
      });

      spinner.stop();
      consecutiveErrors = 0;

      const msg = response.choices[0]?.message;
      const answer = msg?.content || msg?.reasoning_content || 'Жауап жоқ';
      messages.push({ role: 'assistant', content: answer });

      console.log(formatResponse(answer));

    } catch (error) {
      spinner.stop();
      consecutiveErrors++;

      if (error.message.includes('terminated') || error.message.includes('ECONNRESET')) {
        console.log(formatError('Байланыс үзілді'));
        console.log(chalk.yellow('💡 Қайта көріп жатыр...'));
        messages.pop();
      } else if (error.message.includes('API key')) {
        console.log(formatError('API-кілт керек'));
        console.log(chalk.gray('   qazaq config --set <provider>.apiKey=КІЛТІҢІЗ'));
        messages.pop();
      } else {
        console.log(formatError(error.message));
        messages.pop();
      }

      if (consecutiveErrors >= 3) {
        console.log(formatError('Қателер тым көп. Байланысты тексеріңіз.'));
        break;
      }
    }
  }
}
