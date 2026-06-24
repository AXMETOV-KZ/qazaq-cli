// src/providers/index.js
// Провайдер фабрикасы. getClient() — бұрынғымен бірдей { client, info } қайтарады,
// сондықтан ask.js / chat.js / agent.js өзгеріссіз жұмыс істейді.
import OpenAI from 'openai';
import { PROVIDERS, DEFAULT_PROVIDER, MODELS } from './registry.js';
import { loadConfig } from '../utils/config.js';

// Провайдерге қатысты конфиг кілттері — жалаң нүктелі жолдар, мыс. "openai.apiKey".
function cfgGet(cfg, id, field) {
	return cfg[`${id}.${field}`];
}

export function getClient(provider) {
	const cfg = loadConfig();
	const id = provider || cfg.provider || process.env.QAZAQ_PROVIDER || DEFAULT_PROVIDER;
	const preset = PROVIDERS[id];

	if (!preset) {
		throw new Error(
			`Белгісіз провайдер: "${id}". Қолжетімді: ${Object.keys(PROVIDERS).join(', ')}`,
		);
	}

	const baseURL =
		cfgGet(cfg, id, 'baseURL') || cfg.baseURL || process.env.QAZAQ_BASE_URL || preset.baseURL;

	const apiKey =
		cfgGet(cfg, id, 'apiKey') ||
		cfg.apiKey ||
		(preset.envKey && process.env[preset.envKey]) ||
		process.env.QAZAQ_API_KEY;

	const model =
		cfgGet(cfg, id, 'model') || cfg.model || process.env.QAZAQ_MODEL || preset.defaultModel;

	if (!baseURL) {
		throw new Error(
			`"${id}" үшін baseURL керек. Орнату: qazaq config --set ${id}.baseURL=https://...`,
		);
	}

	if (!apiKey && !preset.keyOptional) {
		const envHint = preset.envKey ? ` (немесе ${preset.envKey} env-айнымалысы)` : '';
		throw new Error(
			`${preset.name} үшін API-кілт керек${envHint}.\n` +
				`Орнату: qazaq config --set ${id}.apiKey=СІЗДІҢ_КІЛТ`,
		);
	}

	const defaultHeaders =
		id === 'openrouter'
			? {
					'HTTP-Referer': 'https://github.com/AXMETOV-KZ/qazaq-cli',
					'X-Title': 'Qazaq CLI',
			  }
			: undefined;

	const client = new OpenAI({
		baseURL,
		apiKey: apiKey || 'not-needed',
		defaultHeaders,
	});

	return {
		client,
		info: {
			name: preset.name,
			provider: id,
			defaultModel: model,
			baseURL,
		},
	};
}

// TUI/командаларда провайдер тізімін көрсету үшін.
export function listProviders() {
	return Object.entries(PROVIDERS).map(([id, p]) => ({
		id,
		name: p.name,
		defaultModel: p.defaultModel,
		envKey: p.envKey,
		keyOptional: !!p.keyOptional,
	}));
}

export function getActiveProviderId() {
	const cfg = loadConfig();
	return cfg.provider || process.env.QAZAQ_PROVIDER || DEFAULT_PROVIDER;
}

export function listModels(providerId) {
	const id = providerId || getActiveProviderId();
	return MODELS[id] || [];
}

// Провайдер API-сінен нақты қолжетімді модельдер тізімін алу.
export async function fetchModels(providerId) {
	const id = providerId || getActiveProviderId();
	try {
		const { client } = getClient(id);
		const res = await client.models.list();
		const ids = (res?.data || []).map(m => m.id).filter(Boolean);
		if (ids.length) return ids.sort().slice(0, 100);
	} catch {
		// желі/кілт қатесі → статикалық каталогқа қайтамыз
	}
	return MODELS[id] || [];
}

export { PROVIDERS, DEFAULT_PROVIDER, MODELS } from './registry.js';
