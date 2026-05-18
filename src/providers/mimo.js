import OpenAI from 'openai';

const MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';

export function createMimoClient(apiKey) {
  if (!apiKey) {
    throw new Error('MIMO_API_KEY орнатылмаған. Орнату үшін: qazaq config --set mimoApiKey=КІЛТІҢІЗ');
  }

  return new OpenAI({
    baseURL: MIMO_BASE_URL,
    apiKey: apiKey,
  });
}

export const mimoInfo = {
  name: 'Xiaomi MiMo',
  requiresKey: true,
  defaultModel: 'mimo-v2.5-pro',
};
