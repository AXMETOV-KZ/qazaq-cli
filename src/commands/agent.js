import chalk from 'chalk';
import ora from 'ora';
import { getClient } from '../providers/index.js';
import { Agent } from '../agent/index.js';
import { registerAllTools } from '../agent/tools.js';

registerAllTools();

export async function agentCommand(question, options) {
  if (!question || question.trim().length === 0) {
    console.log(chalk.red('Tapsyrma bos bolmawy kerek'));
    console.log(chalk.gray('Qoldany: qazaq agent "suraq nemese tapsyrma"'));
    process.exit(1);
  }

  let client, info;
  try {
    const result = getClient(options.provider);
    client = result.client;
    info = result.info;
  } catch (e) {
    console.log(chalk.red(e.message));
    process.exit(1);
  }

  const model = options.model || info.defaultModel;
  console.log(chalk.bold(`\n[Qazaq Agent] ${info.name} — ${model}\n`));

  const spinner = ora('Oylanyp jatyr...').start();

  const agent = new Agent({
    client,
    model,
    onToolStart: () => {},
    onToolEnd: () => {},
    maxIterations: 15,
  });

  try {
    const { answer, iterations } = await agent.run(question.trim());
    spinner.stop();
    console.log(answer);
    console.log(chalk.gray(`\n(${iterations} iteraciya)\n`));
  } catch (e) {
    spinner.stop();
    console.log(chalk.red(`\nQate: ${e.message}\n`));
    process.exit(1);
  }
}
