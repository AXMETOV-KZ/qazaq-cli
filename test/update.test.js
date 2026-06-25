import { describe, it, expect } from 'vitest';
import { isNewer } from '../src/utils/update.js';

describe('isNewer', () => {
	it('1.3.0 новее 1.2.1', () => expect(isNewer('1.3.0', '1.2.1')).toBe(true));
	it('1.2.1 не новее 1.3.0', () => expect(isNewer('1.2.1', '1.3.0')).toBe(false));
	it('равные версии — не новее', () => expect(isNewer('1.3.0', '1.3.0')).toBe(false));
	it('патч-релиз новее', () => expect(isNewer('1.3.1', '1.3.0')).toBe(true));
});
