import { describe, it, expect, afterEach } from 'vitest';
import { PROVIDERS, DEFAULT_PROVIDER } from '../src/providers/registry.js';
import { listProviders, getClient } from '../src/providers/index.js';

describe('registry', () => {
	it('содержит ≥10 провайдеров и дефолтный среди них', () => {
		expect(Object.keys(PROVIDERS).length).toBeGreaterThanOrEqual(10);
		expect(PROVIDERS[DEFAULT_PROVIDER]).toBeTruthy();
	});

	it('у каждого пресета есть name (и defaultModel, кроме custom)', () => {
		for (const [id, p] of Object.entries(PROVIDERS)) {
			expect(p.name, `name for ${id}`).toBeTruthy();
			if (id !== 'custom') expect(p.defaultModel, `model for ${id}`).toBeTruthy();
		}
	});
});

describe('listProviders', () => {
	it('возвращает массив с openai', () => {
		const list = listProviders();
		expect(Array.isArray(list)).toBe(true);
		expect(list.find(p => p.id === 'openai')).toBeTruthy();
	});
});

describe('getClient', () => {
	afterEach(() => {
		delete process.env.QAZAQ_PROVIDER;
		delete process.env.OPENAI_API_KEY;
	});

	it('бросает ошибку на неизвестный провайдер', () => {
		expect(() => getClient('definitely-not-real')).toThrow();
	});

	it('создаёт клиент, когда ключ задан через env', () => {
		process.env.OPENAI_API_KEY = 'sk-test-123';
		const { client, info } = getClient('openai');
		expect(client).toBeTruthy();
		expect(info.provider).toBe('openai');
		expect(info.defaultModel).toBeTruthy();
		expect(info.baseURL).toContain('openai.com');
	});

	it('ollama работает без ключа (keyOptional)', () => {
		const { client, info } = getClient('ollama');
		expect(client).toBeTruthy();
		expect(info.provider).toBe('ollama');
	});
});
