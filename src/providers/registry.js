// src/providers/registry.js
// Барлық провайдерлер OpenAI-үйлесімді API арқылы қосылады (api key + baseURL).
// Жаңа провайдер қосу үшін осы тізімге бір жол қосыңыз — басқа ештеңе керек емес.

export const PROVIDERS = {
	openai: {
		name: 'OpenAI',
		baseURL: 'https://api.openai.com/v1',
		envKey: 'OPENAI_API_KEY',
		defaultModel: 'gpt-4o-mini',
	},
	openrouter: {
		name: 'OpenRouter',
		baseURL: 'https://openrouter.ai/api/v1',
		envKey: 'OPENROUTER_API_KEY',
		defaultModel: 'openai/gpt-4o-mini',
	},
	groq: {
		name: 'Groq',
		baseURL: 'https://api.groq.com/openai/v1',
		envKey: 'GROQ_API_KEY',
		defaultModel: 'llama-3.3-70b-versatile',
	},
	deepseek: {
		name: 'DeepSeek',
		baseURL: 'https://api.deepseek.com',
		envKey: 'DEEPSEEK_API_KEY',
		defaultModel: 'deepseek-chat',
	},
	together: {
		name: 'Together AI',
		baseURL: 'https://api.together.xyz/v1',
		envKey: 'TOGETHER_API_KEY',
		defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
	},
	mistral: {
		name: 'Mistral',
		baseURL: 'https://api.mistral.ai/v1',
		envKey: 'MISTRAL_API_KEY',
		defaultModel: 'mistral-large-latest',
	},
	xai: {
		name: 'xAI Grok',
		baseURL: 'https://api.x.ai/v1',
		envKey: 'XAI_API_KEY',
		defaultModel: 'grok-2-latest',
	},
	gemini: {
		name: 'Google Gemini',
		baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
		envKey: 'GEMINI_API_KEY',
		defaultModel: 'gemini-2.0-flash',
	},
	ollama: {
		name: 'Ollama (local)',
		baseURL: 'http://localhost:11434/v1',
		envKey: 'OLLAMA_API_KEY',
		defaultModel: 'llama3.1',
		keyOptional: true,
	},
	custom: {
		name: 'Custom (OpenAI-compatible)',
		baseURL: null,
		envKey: 'QAZAQ_API_KEY',
		defaultModel: null,
	},
};

export const DEFAULT_PROVIDER = 'openai';

// Провайдер бойынша танымал модельдер (/model менюінде көрсетіледі).
// Тізімді еркін кеңейтуге болады; custom үшін /baptau арқылы қолмен енгізіледі.
export const MODELS = {
	openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o3-mini'],
	openrouter: [
		'openai/gpt-4o-mini',
		'anthropic/claude-3.5-sonnet',
		'google/gemini-2.0-flash-exp',
		'meta-llama/llama-3.3-70b-instruct',
		'deepseek/deepseek-chat',
	],
	groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
	deepseek: ['deepseek-chat', 'deepseek-reasoner'],
	together: [
		'meta-llama/Llama-3.3-70B-Instruct-Turbo',
		'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
		'Qwen/Qwen2.5-72B-Instruct-Turbo',
	],
	mistral: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
	xai: ['grok-2-latest', 'grok-2-vision-latest', 'grok-beta'],
	gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
	ollama: ['llama3.1', 'llama3.2', 'qwen2.5-coder', 'mistral', 'gemma2'],
	custom: [],
};
