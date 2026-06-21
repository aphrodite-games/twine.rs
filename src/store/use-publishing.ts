import * as React from 'react';
import {publishArchive, publishStory, PublishOptions} from '../util/publish';
import {
	createStoryBuildPackage,
	StoryBuildPackage,
	StoryBuildTarget
} from '../util/build-package';
import {useCoreProjectHost} from '../core/project-host';
import {usePrefsContext} from './prefs';
import {
	formatWithNameAndVersion,
	loadFormatProperties,
	useStoryFormatsContext
} from './story-formats';
import {storyWithId, useStoriesContext} from './stories';
import {getAppInfo} from '../util/app-info';

export type PublishStoryOptions = PublishOptions & {
	buildTarget?: StoryBuildTarget;
};

export interface UsePublishingProps {
	proofStoryPackage: (storyId: string) => Promise<StoryBuildPackage>;
	proofStory: (storyId: string) => Promise<string>;
	publishArchive: (storyIds?: string[]) => Promise<string>;
	publishStoryPackage: (
		storyId: string,
		publishOptions?: PublishStoryOptions
	) => Promise<StoryBuildPackage>;
	publishStory: (
		storyId: string,
		publishOptions?: PublishStoryOptions
	) => Promise<string>;
	publishStoryData: (storyId: string) => string;
}

/**
 * A React hook to publish stories from context. You probably want to use
 * `useStoryLaunch` instead--this is for doing the actual binding of the story
 * and story format.
 */
export function usePublishing(): UsePublishingProps {
	// As little logic as possible should live here--instead it should be in
	// util/publish.ts.

	const {prefs} = usePrefsContext();
	const {dispatch: storyFormatsDispatch, formats} = useStoryFormatsContext();
	const {stories} = useStoriesContext();
	const coreProjectHost = useCoreProjectHost();

	const assetInventoryForStory = React.useCallback(
		(storyId: string) => {
			return coreProjectHost.queryStoryIndex(storyId).assetInventory;
		},
		[coreProjectHost]
	);

	return {
		publishArchive: React.useCallback(
			async () => publishArchive(stories, getAppInfo()),
			[stories]
		),
		proofStory: React.useCallback(
			async storyId => {
				const story = storyWithId(stories, storyId);
				const format = formatWithNameAndVersion(
					formats,
					prefs.proofingFormat.name,
					prefs.proofingFormat.version
				);
				const formatProperties =
					await loadFormatProperties(format)(storyFormatsDispatch);

				if (!formatProperties) {
					throw new Error(`Couldn't load story format properties`);
				}

				return createStoryBuildPackage(story, getAppInfo(), {
					assetInventory: assetInventoryForStory(storyId),
					formatProperties,
					target: 'proof'
				}).html;
			},
			[
				assetInventoryForStory,
				formats,
				prefs.proofingFormat.name,
				prefs.proofingFormat.version,
				stories,
				storyFormatsDispatch
			]
		),
		proofStoryPackage: React.useCallback(
			async storyId => {
				const story = storyWithId(stories, storyId);
				const format = formatWithNameAndVersion(
					formats,
					prefs.proofingFormat.name,
					prefs.proofingFormat.version
				);
				const formatProperties =
					await loadFormatProperties(format)(storyFormatsDispatch);

				if (!formatProperties) {
					throw new Error(`Couldn't load story format properties`);
				}

				return createStoryBuildPackage(story, getAppInfo(), {
					assetInventory: assetInventoryForStory(storyId),
					formatProperties,
					target: 'proof'
				});
			},
			[
				assetInventoryForStory,
				formats,
				prefs.proofingFormat.name,
				prefs.proofingFormat.version,
				stories,
				storyFormatsDispatch
			]
		),
		publishStory: React.useCallback(
			async (storyId, publishOptions) => {
				const story = storyWithId(stories, storyId);
				const format = formatWithNameAndVersion(
					formats,
					story.storyFormat,
					story.storyFormatVersion
				);
				const formatProperties =
					await loadFormatProperties(format)(storyFormatsDispatch);

				if (!formatProperties) {
					throw new Error(`Couldn't load story format properties`);
				}

				const {buildTarget = 'play', ...htmlOptions} = publishOptions ?? {};

				return createStoryBuildPackage(story, getAppInfo(), {
					...htmlOptions,
					assetInventory:
						publishOptions?.assetInventory ?? assetInventoryForStory(storyId),
					formatProperties,
					target: buildTarget
				}).html;
			},
			[assetInventoryForStory, formats, stories, storyFormatsDispatch]
		),
		publishStoryPackage: React.useCallback(
			async (storyId, publishOptions) => {
				const story = storyWithId(stories, storyId);
				const format = formatWithNameAndVersion(
					formats,
					story.storyFormat,
					story.storyFormatVersion
				);
				const formatProperties =
					await loadFormatProperties(format)(storyFormatsDispatch);

				if (!formatProperties) {
					throw new Error(`Couldn't load story format properties`);
				}

				const {buildTarget = 'play', ...htmlOptions} = publishOptions ?? {};

				return createStoryBuildPackage(story, getAppInfo(), {
					...htmlOptions,
					assetInventory:
						publishOptions?.assetInventory ?? assetInventoryForStory(storyId),
					formatProperties,
					target: buildTarget
				});
			},
			[assetInventoryForStory, formats, stories, storyFormatsDispatch]
		),
		publishStoryData: React.useCallback(
			(storyId: string) => {
				const story = storyWithId(stories, storyId);

				return publishStory(story, getAppInfo(), {
					assetInventory: assetInventoryForStory(storyId),
					startOptional: true
				});
			},
			[assetInventoryForStory, stories]
		)
	};
}
