import chalk from 'chalk';
import ora from 'ora';
import { getClient } from '../providers/index.js';
import { formatResponse, formatError, formatProvider } from '../utils/format.js';

export async function askCommand(question, options) {
  if (!question || question.trim().length === 0) {
    console.log(formatError('Сұрақ бос болмауы керек'));
    console.log(chalk.gray('Қолдану: qazaq ask "сұрағыңыз"'));
    process.exit(1);
  }

  const spinner = ora('Ойланып жатыр...').start();

  try {
    const { client, info } = getClient(options.provider);
    const model = options.model || info.defaultModel;

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'Сен пайдалы AI-көмекшісің. Қысқа әрі нақты жауап бер.' },
        { role: 'user', content: question.trim() }
      ],
      max_tokens: 2048,
    });

    spinner.stop();

    const msg = response.choices[0]?.message;
    const answer = msg?.content || msg?.reasoning_content || 'Жауап жоқ';
    console.log(formatProvider(info.name, model));
    console.log(formatResponse(answer));

  } catch (error) {
    spinner.stop();

    if (error.message.includes('terminated') || error.message.includes('ECONNRESET')) {
      console.log(formatError('Байланыс үзілді'));
      console.log(chalk.yellow('💡 Қайта көріңіз не провайдерді ауыстырыңыз:'));
      console.log(chalk.gray('   qazaq config --set provider=openai'));
    } else if (error.message.includes('API key')) {
      console.log(formatError('API-кілт керек'));
      console.log(chalk.yellow('💡 Кілтті орнатыңыз:'));
      console.log(chalk.gray('   qazaq config --set <provider>.apiKey=КІЛТІҢІЗ'));
    } else if (error.message.includes('fetch failed')) {
      console.log(formatError('Интернет жоқ не сервер қол жетімсіз'));
      console.log(chalk.yellow('💡 Интернет байланысын тексеріңіз'));
    } else {
      console.log(formatError(error.message));
    }

    process.exit(1);
  }
}
