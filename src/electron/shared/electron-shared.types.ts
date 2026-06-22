import {Story} from '../../store/stories/stories.types';
import type {CoreAssetInventoryEntry} from '../../core';
import type {StoryBuildAsset} from '../../util/build-package';

export interface TwineElectronWindow extends Window {
	twineElectron?: {
		chooseAssetFile(defaultPath?: string): Promise<string | undefined>;
		chooseStoryLibraryFolder(): Promise<string | undefined>;
		copyText(text: string): void;
		copyAssetToProject(
			rootPath: string,
			sourcePath: string
		): Promise<{sourcePath: string; targetPath: string}>;
		createProjectFolder(
			story: Story,
			preferredParent?: string
		): Promise<{rootPath: string; stories: Story[]; storyIds: string[]}>;
		deleteProjectAsset(rootPath: string, path: string): Promise<void>;
		deleteStory(story: Story): void;
		getStoryLibraryFolder(): Promise<string>;
		loadPrefs(): Promise<any>;
		loadStories(): Promise<any>;
		loadStoryFormats(): Promise<any>;
		listProjectAssets(rootPath: string): Promise<CoreAssetInventoryEntry[]>;
		jsonp(
			url: string,
			options: {name?: string; timeout?: number},
			callback: (error: Error | null, data?: any) => void
		): () => void;
		onceStoryRenamed(callback: () => void): void;
		openWithScratchFile(data: string, filename: string): void;
		openWithScratchPackage(
			data: string,
			filename: string,
			assets: Pick<StoryBuildAsset, 'outputPath' | 'sourcePath'>[]
		): void;
		openProjectFolder(): Promise<
			{rootPath: string; stories: Story[]; storyIds: string[]} | undefined
		>;
		revealStoryLibraryFolder(): Promise<void>;
		revealPath(path: string): void;
		renameProjectAsset(
			rootPath: string,
			oldPath: string,
			newPath: string
		): Promise<{sourcePath: string; targetPath: string}>;
		renameStory(oldStory: Story, newStory: Story): void;
		replaceProjectAsset(
			rootPath: string,
			path: string,
			sourcePath: string
		): Promise<{sourcePath: string; targetPath: string}>;
		saveProjectFolder(
			rootPath: string,
			story: Story
		): Promise<{rootPath: string; stories: Story[]; storyIds: string[]}>;
		saveStoryHtml(story: Story, data: string): void;
		saveJson(filename: string, data: any): void;
	};
}
