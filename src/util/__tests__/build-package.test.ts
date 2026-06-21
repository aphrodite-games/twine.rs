import {
	buildAssetCopyPlan,
	createStoryBuildPackage,
	filePathFromFileUrl,
	safeBuildAssetOutputPath
} from '../build-package';
import {
	fakeAppInfo,
	fakeStory,
	fakeStoryFormatProperties
} from '../../test-util';
import type {CoreAssetInventoryEntry} from '../../core/bindings/CoreAssetInventoryEntry';

function asset(
	props: Partial<CoreAssetInventoryEntry> = {}
): CoreAssetInventoryEntry {
	return {
		durationMs: null,
		exists: true,
		height: null,
		kind: 'image',
		missing: false,
		modifiedAt: null,
		normalizedPath: 'assets/cover.png',
		path: 'assets/cover.png',
		previewUrl: 'file:///tmp/cover.png',
		publish: {
			copy: true,
			outputPath: 'assets/cover.png',
			reason: 'Copy asset into published output'
		},
		referenceCount: 1,
		references: [],
		sizeBytes: 12,
		snippet: {
			label: 'Insert asset reference',
			mediaType: 'image',
			text: '<img src="assets/cover.png" alt="">'
		},
		thumbnailUrl: 'file:///tmp/cover.png',
		unused: false,
		width: null,
		...props
	};
}

describe('M6 build package', () => {
	it('creates a copy plan from publishable asset inventory', () => {
		expect(filePathFromFileUrl('file:///tmp/cover%20art.png')).toBe(
			'/tmp/cover art.png'
		);
		expect(safeBuildAssetOutputPath('./assets/cover.png')).toBe(
			'assets/cover.png'
		);
		expect(() => safeBuildAssetOutputPath('../cover.png')).toThrow();

		expect(buildAssetCopyPlan([asset()])).toEqual([
			expect.objectContaining({
				outputPath: 'assets/cover.png',
				path: 'assets/cover.png',
				sourcePath: '/tmp/cover.png'
			})
		]);
	});

	it('builds preview packages with report metadata', () => {
		const story = fakeStory();
		const properties = fakeStoryFormatProperties();
		const result = createStoryBuildPackage(story, fakeAppInfo(), {
			assetInventory: [asset()],
			formatProperties: properties,
			target: 'play'
		});

		expect(result.html).toContain('<tw-storydata');
		expect(result.assets).toHaveLength(1);
		expect(result.report).toEqual(
			expect.objectContaining({
				assetCount: 1,
				copiedAssetCount: 1,
				publishSafe: true,
				target: 'play'
			})
		);
	});

	it('blocks publish packages when dev-only format code would ship', () => {
		const story = fakeStory();
		const properties = {
			...fakeStoryFormatProperties(),
			source: '{{STORY_DATA}}<script>import.meta.hot</script>'
		};

		expect(() =>
			createStoryBuildPackage(story, fakeAppInfo(), {
				formatProperties: properties,
				target: 'publish'
			})
		).toThrow('not publish-safe');

		expect(() =>
			createStoryBuildPackage(story, fakeAppInfo(), {
				formatProperties: properties,
				target: 'test'
			})
		).not.toThrow();
	});
});
