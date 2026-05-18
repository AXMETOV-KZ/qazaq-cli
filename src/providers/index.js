import { createGatewayClient, gatewayInfo } from './gateway.js';
import { createMimoClient, mimoInfo } from './mimo.js';
import { loadConfig } from '../utils/config.js';

export function getClient(provider) {
  const cfg = loadConfig();
  const selectedProvider = provider || cfg.provider || 'gateway';

  switch (selectedProvider) {
    case 'gateway':
      return { client: createGatewayClient(), info: gatewayInfo };
    case 'mimo':
      return { client: createMimoClient(cfg.mimoApiKey || process.env.MIMO_API_KEY), info: mimoInfo };
    default:
      throw new Error(`Белгісіз провайдер: ${selectedProvider}. Қол жетімді: gateway, mimo`);
  }
}

export { gatewayInfo, mimoInfo };
