import * as React from 'react';
import {publishArchive, publishStory, PublishOptions} from '../util/publish';
import {
	createStoryBuildPackage,
	StoryBuildPackage,
	StoryHtmlBuildTarget,
	StoryBuildTarget
} from '../util/build-package';
import {useCoreProjectHost} from '../core/project-host';
import type {CoreAssetInventoryEntry} from '../core';
import {usePrefsContext} from './prefs';
import {
	formatWithNameAndVersion,
	loadFormatProperties,
	useStoryFormatsContext
} from './story-formats';
import {storyWithId, useStoriesContext} from './stories';
import {getAppInfo} from '../util/app-info';

export type PublishStoryOptions = PublishOptions & {
	buildTarget?: StoryHtmlBuildTarget;
};

export type BuildStoryPackageOptions = PublishOptions & {
	buildTarget?: StoryBuildTarget;
};

export interface UsePublishingProps {
	buildStoryPackage: (
		storyId: string,
		target: StoryBuildTarget,
		publishOptions?: PublishOptions
	) => Promise<StoryBuildPackage>;
	proofStoryPackage: (
		storyId: string,
		assetInventory?: CoreAssetInventoryEntry[]
	) => Promise<StoryBuildPackage>;
	proofStory: (storyId: string) => Promise<string>;
	publishArchive: (storyIds?: string[]) => Promise<string>;
	publishStoryPackage: (
		storyId: string,
		publishOptions?: BuildStoryPackageOptions
	) => Promise<StoryBuildPackage>;
	publishStory: (
		storyId: string,
		publishOptions?: PublishStoryOptions
	) => Promise<string>;
	publishStoryData: (storyId: string) => Promise<string>;
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
		async (storyId: string) => {
			return (await coreProjectHost.queryStoryIndexAsync(storyId))
				.assetInventory;
		},
		[coreProjectHost]
	);

	const buildStoryPackage = React.useCallback(
		async (
			storyId: string,
			target: StoryBuildTarget,
			publishOptions?: PublishOptions
		) => {
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

			return createStoryBuildPackage(story, getAppInfo(), {
				...publishOptions,
				assetInventory:
					publishOptions?.assetInventory ??
					(await assetInventoryForStory(storyId)),
				formatProperties,
				target
			});
		},
		[assetInventoryForStory, formats, stories, storyFormatsDispatch]
	);

	return {
		buildStoryPackage,
		publishArchive: React.useCallback(
			async storyIds =>
				publishArchive(
					storyIds
						? stories.filter(story => storyIds.includes(story.id))
						: stories,
					getAppInfo()
				),
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
					assetInventory: await assetInventoryForStory(storyId),
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
			async (storyId, assetInventory) => {
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
					assetInventory:
						assetInventory ?? (await assetInventoryForStory(storyId)),
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
				const {buildTarget = 'play', ...htmlOptions} = publishOptions ?? {};

				return (await buildStoryPackage(storyId, buildTarget, htmlOptions))
					.html;
			},
			[buildStoryPackage]
		),
		publishStoryPackage: React.useCallback(
			async (storyId, publishOptions) => {
				const {buildTarget = 'play', ...htmlOptions} = publishOptions ?? {};

				return buildStoryPackage(storyId, buildTarget, htmlOptions);
			},
			[buildStoryPackage]
		),
		publishStoryData: React.useCallback(
			async (storyId: string) => {
				const story = storyWithId(stories, storyId);

				return publishStory(story, getAppInfo(), {
					assetInventory: await assetInventoryForStory(storyId),
					startOptional: true
				});
			},
			[assetInventoryForStory, stories]
		)
	};
}
