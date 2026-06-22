import {getAppInfo} from '../app-info';

describe('getAppInfo', () => {
	beforeAll(() => {
		process.env.VITE_APP_NAME = 'mock-app-name';
		process.env.VITE_APP_VERSION = '1.2.3';
		process.env.VITE_TWINE_COMPATIBILITY_VERSION = '2.12.0';
	});

	afterAll(() => {
		delete process.env.VITE_APP_NAME;
		delete process.env.VITE_APP_VERSION;
		delete process.env.VITE_TWINE_COMPATIBILITY_VERSION;
	});

	it('reads information from the environment', () =>
		expect(getAppInfo()).toEqual({
			name: 'mock-app-name',
			twineCompatibilityVersion: '2.12.0',
			version: '1.2.3'
		}));
});
