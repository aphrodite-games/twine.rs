import {readdirSync, readFileSync, statSync} from 'fs';
import path from 'path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const allowedProducerFiles = new Set([
	path.join(sourceRoot, 'core', 'graph-projection.ts'),
	path.join(sourceRoot, 'core', 'story-index.ts'),
	path.join(sourceRoot, 'test-util', 'test-core-session-client.ts')
]);
const forbiddenProducerSymbols = [
	'saveGeneratedGraphLayout',
	'storyToCoreGraphProjection',
	'storyToCoreIndex'
];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap(entry => {
		const fullPath = path.join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			return sourceFiles(fullPath);
		}

		return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
	});
}

function isAllowedProducerUse(filePath: string) {
	return (
		allowedProducerFiles.has(filePath) ||
		filePath.includes(`${path.sep}__tests__${path.sep}`)
	);
}

describe('Rust authority import guard', () => {
	it('keeps TypeScript graph and index producers out of product code', () => {
		const violations = sourceFiles(sourceRoot).flatMap(filePath => {
			if (isAllowedProducerUse(filePath)) {
				return [];
			}

			const source = readFileSync(filePath, 'utf8');
			const symbolViolations = forbiddenProducerSymbols.filter(symbol =>
				new RegExp(`\\b${symbol}\\b`).test(source)
			);
			const barrelViolation =
				/export\s+\*\s+from\s+['"]\.\/(?:graph-projection|story-index)['"]/.test(
					source
				);

			return [
				...symbolViolations.map(symbol => `${filePath}: ${symbol}`),
				...(barrelViolation ? [`${filePath}: producer barrel re-export`] : [])
			];
		});

		expect(violations).toEqual([]);
	});
});
