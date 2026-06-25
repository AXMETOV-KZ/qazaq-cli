import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSIONS_DIR = join(homedir(), '.qazaq', 'sessions');

function ensureDir() {
	if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
}

export function newSessionId() {
	const d = new Date();
	const p = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function saveSession(id, messages) {
	const clean = (messages || [])
		.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
		.map(m => ({ role: m.role, content: m.content }));
	if (clean.length === 0) return;
	ensureDir();
	const firstUser = clean.find(m => m.role === 'user');
	const title = (firstUser?.content || 'Sessiya').slice(0, 50).replace(/\n/g, ' ');
	const data = { id, savedAt: new Date().toISOString(), title, messages: clean };
	writeFileSync(join(SESSIONS_DIR, `${id}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

export function listSessions() {
	ensureDir();
	let files = [];
	try { files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json')); } catch { return []; }
	const out = [];
	for (const f of files) {
		try {
			const d = JSON.parse(readFileSync(join(SESSIONS_DIR, f), 'utf-8'));
			out.push({ id: d.id, savedAt: d.savedAt, title: d.title || d.id, count: (d.messages || []).length });
		} catch {}
	}
	return out.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

export function loadSession(id) {
	try {
		const d = JSON.parse(readFileSync(join(SESSIONS_DIR, `${id}.json`), 'utf-8'));
		return d.messages || [];
	} catch { return null; }
}
