import {usePublishing} from './use-publishing';
import {isElectronRenderer} from '../util/is-electron';
import {TwineElectronWindow} from '../electron/shared';
import {loadProjectMetadata} from './project-metadata';
import {
	replaceKnownAssetInventoryForStory,
	type CoreAssetInventoryEntry
} from '../core';

export interface UseStoryLaunchProps {
	playStory: (storyId: string) => Promise<void>;
	proofStory: (storyId: string) => Promise<void>;
	testStory: (storyId: string, startPassageId?: string) => Promise<void>;
}

type TwineElectronBridge = NonNullable<TwineElectronWindow['twineElectron']>;

async function refreshedProjectAssets(
	storyId: string,
	twineElectron: TwineElectronBridge
) {
	const projectRoot = loadProjectMetadata(storyId)?.rootPath;

	if (
		!projectRoot ||
		(!twineElectron.projectSessionSnapshot && !twineElectron.listProjectAssets)
	) {
		return undefined;
	}

	let inventory: CoreAssetInventoryEntry[];

	try {
		const snapshot = twineElectron.projectSessionSnapshot
			? await twineElectron.projectSessionSnapshot(projectRoot)
			: undefined;

		inventory =
			snapshot?.assets ?? (await twineElectron.listProjectAssets(projectRoot));
	} catch (error) {
		console.warn('Unable to refresh project assets before preview.', error);
		return undefined;
	}

	replaceKnownAssetInventoryForStory(storyId, inventory);
	return inventory;
}

/**
 * Provides functions to launch a story that include the correct handling for
 * both web and Electron contexts.
 */
export function useStoryLaunch(): UseStoryLaunchProps {
	const {proofStoryPackage, publishStoryPackage} = usePublishing();

	if (isElectronRenderer()) {
		const {twineElectron} = window as TwineElectronWindow;

		if (!twineElectron) {
			throw new Error('Electron bridge is not present on window.');
		}
		const twineElectronBridge = twineElectron;

		// These are async to match the type in the browser context.
		return {
			playStory: async storyId => {
				const assetInventory = await refreshedProjectAssets(
					storyId,
					twineElectronBridge
				);
				const build = await publishStoryPackage(storyId, {
					assetInventory,
					buildTarget: 'play'
				});

				twineElectronBridge.openWithScratchPackage(
					build.html,
					`play-${storyId}.html`,
					build.assets
				);
			},
			proofStory: async storyId => {
				const assetInventory = await refreshedProjectAssets(
					storyId,
					twineElectronBridge
				);
				const build = await proofStoryPackage(storyId, assetInventory);

				twineElectronBridge.openWithScratchPackage(
					build.html,
					`proof-${storyId}.html`,
					build.assets
				);
			},
			testStory: async (storyId, startPassageId) => {
				const assetInventory = await refreshedProjectAssets(
					storyId,
					twineElectronBridge
				);
				const build = await publishStoryPackage(storyId, {
					assetInventory,
					buildTarget: 'test',
					formatOptions: 'debug',
					...(startPassageId
						? {startId: startPassageId, startMode: 'afterStartup' as const}
						: {startId: undefined})
				});

				twineElectronBridge.openWithScratchPackage(
					build.html,
					`test-${storyId}.html`,
					build.assets
				);
			}
		};
	}

	return {
		playStory: async storyId => {
			window.open(`#/stories/${storyId}/play`, '_blank');
		},
		proofStory: async storyId => {
			window.open(`#/stories/${storyId}/proof`, '_blank');
		},
		testStory: async (storyId, startPassageId) => {
			window.open(
				startPassageId
					? `#/stories/${storyId}/test/${startPassageId}`
					: `#/stories/${storyId}/test`,
				'_blank'
			);
		}
	};
}
