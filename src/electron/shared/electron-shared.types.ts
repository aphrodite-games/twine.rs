import {Story} from '../../store/stories/stories.types';
import type {StoryBuildAsset} from '../../util/build-package';

export interface TwineElectronWindow extends Window {
	twineElectron?: {
		copyText(text: string): void;
		deleteStory(story: Story): void;
		loadPrefs(): Promise<any>;
		loadStories(): Promise<any>;
		loadStoryFormats(): Promise<any>;
		onceStoryRenamed(callback: () => void): void;
		openWithScratchFile(data: string, filename: string): void;
		openWithScratchPackage(
			data: string,
			filename: string,
			assets: Pick<StoryBuildAsset, 'outputPath' | 'sourcePath'>[]
		): void;
		revealPath(path: string): void;
		renameStory(oldStory: Story, newStory: Story): void;
		saveStoryHtml(story: Story, data: string): void;
		saveJson(filename: string, data: any): void;
	};
}
