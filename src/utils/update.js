import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export function currentVersion() {
	const here = dirname(fileURLToPath(import.meta.url));
	const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf-8'));
	return pkg.version;
}

// true, если a новее b (semver major.minor.patch)
export function isNewer(a, b) {
	const pa = String(a).split('.').map(Number);
	const pb = String(b).split('.').map(Number);
	for (let i = 0; i < 3; i++) {
		if ((pa[i] || 0) > (pb[i] || 0)) return true;
		if ((pa[i] || 0) < (pb[i] || 0)) return false;
	}
	return false;
}

export async function checkForUpdate() {
	const current = currentVersion();
	try {
		const res = await fetch('https://registry.npmjs.org/qazaq-cli/latest', {
			signal: AbortSignal.timeout(5000),
		});
		if (!res.ok) throw new Error(`npm ${res.status}`);
		const data = await res.json();
		const latest = data.version;
		return { current, latest, hasUpdate: isNewer(latest, current) };
	} catch (e) {
		return { current, latest: null, hasUpdate: false, error: e.message };
	}
}
