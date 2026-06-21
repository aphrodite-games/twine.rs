import type {CoreAssetInventoryEntry} from '../core/bindings/CoreAssetInventoryEntry';
import type {StoryFormatProperties} from '../store/story-formats';
import type {Story} from '../store/stories';
import type {AppInfo} from './app-info';
import type {PublishOptions} from './publish';
import {publishStoryWithFormat} from './publish';
import {
	inspectStoryFormatPublishSafety,
	storyFormatCapabilities,
	type StoryFormatCapabilityManifest,
	type StoryFormatPublishSafetyIssue
} from './story-format';

export type StoryBuildTarget = 'play' | 'test' | 'proof' | 'publish';

export interface StoryBuildAsset {
	kind: string;
	outputPath: string;
	path: string;
	sizeBytes: number | null;
	sourcePath: string | null;
	sourceUrl: string | null;
}

export interface StoryBuildReport {
	assetCount: number;
	capabilities: StoryFormatCapabilityManifest;
	copiedAssetCount: number;
	generatedAt: string;
	missingAssets: string[];
	publishSafe: boolean;
	safetyIssues: StoryFormatPublishSafetyIssue[];
	target: StoryBuildTarget;
}

export interface StoryBuildPackage {
	assets: StoryBuildAsset[];
	html: string;
	report: StoryBuildReport;
}

export interface StoryBuildPackageOptions extends PublishOptions {
	formatProperties: StoryFormatProperties;
	target: StoryBuildTarget;
}

function hasUrlScheme(path: string) {
	return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(path);
}

export function safeBuildAssetOutputPath(path: string) {
	const normalized = path.replace(/\\/g, '/').replace(/^(\.\/)+/, '');
	const segments = normalized.split('/').filter(segment => segment.length > 0);

	if (
		normalized.startsWith('/') ||
		hasUrlScheme(normalized) ||
		segments.length === 0 ||
		segments.some(segment => segment === '.' || segment === '..')
	) {
		throw new Error(`Unsafe asset output path "${path}".`);
	}

	return segments.join('/');
}

export function filePathFromFileUrl(url: string | null | undefined) {
	if (!url?.toLowerCase().startsWith('file:')) {
		return null;
	}

	try {
		const parsed = new URL(url);
		const pathname = decodeURIComponent(parsed.pathname);

		if (/^\/[A-Za-z]:\//.test(pathname)) {
			return pathname.slice(1);
		}

		return pathname;
	} catch {
		return null;
	}
}

export function buildAssetCopyPlan(
	assetInventory: CoreAssetInventoryEntry[] = []
): StoryBuildAsset[] {
	return assetInventory
		.filter(
			asset => asset.publish.copy && asset.exists !== false && !asset.missing
		)
		.map(asset => {
			const sourceUrl = asset.previewUrl ?? asset.thumbnailUrl ?? null;

			return {
				kind: asset.kind,
				outputPath: safeBuildAssetOutputPath(
					asset.publish.outputPath || asset.path
				),
				path: asset.path,
				sizeBytes: asset.sizeBytes,
				sourcePath: filePathFromFileUrl(sourceUrl),
				sourceUrl
			};
		});
}

function assertPublishSafety(
	target: StoryBuildTarget,
	issues: StoryFormatPublishSafetyIssue[]
) {
	if (target !== 'publish') {
		return;
	}

	const errors = issues.filter(issue => issue.severity === 'error');

	if (errors.length > 0) {
		throw new Error(
			`Cannot publish because the story format bundle is not publish-safe: ${errors
				.map(issue => issue.message)
				.join(' ')}`
		);
	}
}

export function createStoryBuildPackage(
	story: Story,
	appInfo: AppInfo,
	options: StoryBuildPackageOptions
): StoryBuildPackage {
	const {formatProperties, target, ...publishOptions} = options;
	const safety = inspectStoryFormatPublishSafety(formatProperties);

	assertPublishSafety(target, safety.issues);

	const html = publishStoryWithFormat(
		story,
		formatProperties.source,
		appInfo,
		publishOptions
	);
	const assets = buildAssetCopyPlan(publishOptions.assetInventory);
	const capabilities = storyFormatCapabilities(formatProperties);
	const missingAssets = (publishOptions.assetInventory ?? [])
		.filter(asset => asset.missing)
		.map(asset => asset.path);

	return {
		assets,
		html,
		report: {
			assetCount: publishOptions.assetInventory?.length ?? 0,
			capabilities,
			copiedAssetCount: assets.filter(asset => !!asset.sourcePath).length,
			generatedAt: new Date().toISOString(),
			missingAssets,
			publishSafe: safety.publishSafe,
			safetyIssues: safety.issues,
			target
		}
	};
}
