import * as React from 'react';
import type {CoreAssetInventoryEntry} from './bindings/CoreAssetInventoryEntry';
import type {CoreStoryIndex} from './bindings/CoreStoryIndex';
import type {CoreStoryIndexOptions} from './bindings/CoreStoryIndexOptions';
import type {Patch} from './bindings/Patch';
import type {PatchBatch} from './bindings/PatchBatch';
import type {StoryCommand} from './bindings/StoryCommand';
import {storyToCoreIndex} from './story-index';
import {
	StoriesAction,
	StoriesState,
	Story,
	deletePassages,
	storyWithId,
	updatePassage,
	updateStory
} from '../store/stories';
import type {StoriesActionOrThunk} from '../store/undoable-stories';
import {useUndoableStoriesContext} from '../store/undoable-stories';

export type StoryIndexQuery = string | Partial<CoreStoryIndexOptions>;

export type CoreProjectPatchListener = (patches: PatchBatch) => void;

export interface CoreProjectHost {
	applyStoryCommand(command: StoryCommand, annotation?: string): void;
	queryStoryIndex(storyId: string, options?: StoryIndexQuery): CoreStoryIndex;
	subscribeToPatches(listener: CoreProjectPatchListener): () => void;
}

type UndoableDispatch = (
	action: StoriesActionOrThunk,
	annotation?: string
) => void;

const assetReferenceRegex =
	/([A-Za-z0-9_./~%:@?&=+-]+\.(png|jpe?g|gif|svg|webp|mp3|m4a|ogg|wav|mp4|webm|css|js))/gi;

function storyCommandAnnotation(command: StoryCommand) {
	switch (command.type) {
		case 'createPassage':
		case 'restorePassages':
			return 'undoChange.newPassage';
		case 'deletePassages':
			return 'undoChange.deletePassage';
		case 'movePassages':
		case 'saveGeneratedLayout':
			return 'undoChange.movePassage';
		case 'renamePassage':
			return 'undoChange.renamePassage';
		case 'setPassageTags':
			return 'undoChange.changeTags';
		case 'setStartPassage':
			return 'undoChange.startPassage';
		case 'updatePassageText':
		case 'updateStoryScript':
		case 'updateStoryStylesheet':
			return 'undoChange.editPassage';
		case 'deleteAsset':
		case 'importAsset':
		case 'insertAssetSnippet':
		case 'renameAsset':
		case 'replaceAsset':
			return 'undoChange.editPassage';
		default:
			return undefined;
	}
}

function storyForId(stories: Story[], storyId: string) {
	return storyWithId(stories, storyId);
}

function passageForId(story: Story, passageId: string) {
	const passage = story.passages.find(passage => passage.id === passageId);

	if (!passage) {
		throw new Error(
			`No passage with ID "${passageId}" exists in story "${story.id}".`
		);
	}

	return passage;
}

function normalizedAssetPath(path: string) {
	return path
		.replace(/\\/g, '/')
		.replace(/^\.\//, '')
		.replace(/^assets\//i, 'assets/')
		.toLowerCase();
}

function projectAssetPath(path: string) {
	const normalized = path.replace(/\\/g, '/').replace(/^(\.\/)+/, '');
	const withoutPrefix = normalized.replace(/^assets\//i, '');
	const safeSegments = withoutPrefix
		.split('/')
		.filter(segment => segment && segment !== '.' && segment !== '..');

	return `assets/${safeSegments.join('/') || 'asset'}`;
}

function assetKind(path: string) {
	const extension = path.split('.').pop()?.toLowerCase() ?? '';

	if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) {
		return 'image';
	}

	if (['mp3', 'm4a', 'ogg', 'wav'].includes(extension)) {
		return 'audio';
	}

	if (['mp4', 'webm'].includes(extension)) {
		return 'video';
	}

	if (extension === 'css') {
		return 'stylesheet';
	}

	if (extension === 'js') {
		return 'script';
	}

	return 'file';
}

function assetSnippet(path: string, kind = assetKind(path)) {
	const text =
		kind === 'image'
			? `<img src="${path}" alt="">`
			: kind === 'audio'
				? `<audio src="${path}" controls></audio>`
				: kind === 'video'
					? `<video src="${path}" controls></video>`
					: kind === 'stylesheet'
						? `<link rel="stylesheet" href="${path}">`
						: kind === 'script'
							? `<script src="${path}"></script>`
							: path;

	return {
		label: 'Insert asset reference',
		mediaType: kind,
		text
	};
}

function assetInventoryEntry(path: string): CoreAssetInventoryEntry {
	const normalizedPath = normalizedAssetPath(path);
	const kind = assetKind(path);
	const previewUrl = `asset://${path}`;

	return {
		durationMs: null,
		exists: true,
		height: null,
		kind,
		missing: false,
		modifiedAt: new Date().toISOString(),
		normalizedPath,
		path,
		previewUrl,
		publish: {
			copy: true,
			outputPath: path,
			reason: 'Copy asset into published output'
		},
		referenceCount: 0,
		references: [],
		sizeBytes: null,
		snippet: assetSnippet(path, kind),
		thumbnailUrl: kind === 'image' ? previewUrl : null,
		unused: true,
		width: null
	};
}

function replaceAssetReferences(
	source: string,
	oldPath: string,
	newPath: string
) {
	const oldNormalized = normalizedAssetPath(oldPath);

	return source.replace(assetReferenceRegex, match =>
		normalizedAssetPath(match) === oldNormalized ? newPath : match
	);
}

function insertAtPosition(source: string, position: number, text: string) {
	const safePosition = Math.max(0, Math.min(source.length, position));

	return `${source.slice(0, safePosition)}${text}${source.slice(safePosition)}`;
}

function createPassageProps(
	command: Extract<StoryCommand, {type: 'createPassage'}>
) {
	return {
		...(command.id ? {id: command.id} : {}),
		...(command.layout ?? {}),
		...(command.name ? {name: command.name} : {}),
		tags: command.tags,
		text: command.text
	};
}

function restoredPassageProps(
	command: Extract<StoryCommand, {type: 'restorePassages'}>
) {
	return command.passages.map(passage => ({
		id: passage.id,
		...(passage.layout ?? {}),
		name: passage.name,
		tags: passage.tags,
		text: passage.text
	}));
}

export class StoreCoreProjectHost implements CoreProjectHost {
	private assetInventoryByStory = new Map<string, CoreAssetInventoryEntry[]>();
	private dispatch: UndoableDispatch;
	private listeners = new Set<CoreProjectPatchListener>();
	private publishedStories = new Map<string, Story>();
	private stories: StoriesState;
	private transactionId = BigInt(0);

	constructor(stories: StoriesState, dispatch: UndoableDispatch) {
		this.dispatch = dispatch;
		this.stories = stories;
	}

	applyStoryCommand(command: StoryCommand, annotation?: string) {
		const commandAnnotation = annotation ?? storyCommandAnnotation(command);
		const dispatch = (action: StoriesAction | StoriesActionOrThunk) =>
			this.dispatch(action, commandAnnotation);

		switch (command.type) {
			case 'batch':
				for (const childCommand of command.commands) {
					this.applyStoryCommand(childCommand, commandAnnotation);
				}
				return;

			case 'createPassage':
				dispatch({
					props: createPassageProps(command),
					storyId: command.story_id,
					type: 'createPassage'
				});
				return;

			case 'deletePassages': {
				const story = storyForId(this.stories, command.story_id);
				const passages = command.passage_ids.map(id => passageForId(story, id));

				dispatch(deletePassages(story, passages));
				return;
			}

			case 'movePassages':
				dispatch({
					passageUpdates: Object.fromEntries(
						command.moves.map(move => [move.passageId, move.bounds])
					),
					storyId: command.story_id,
					type: 'updatePassages'
				});
				return;

			case 'renamePassage': {
				const story = storyForId(this.stories, command.story_id);
				const passage = passageForId(story, command.passage_id);

				dispatch(
					updatePassage(
						story,
						passage,
						{name: command.name},
						{dontUpdateOthers: !command.update_references}
					)
				);
				return;
			}

			case 'restorePassages':
				dispatch({
					props: restoredPassageProps(command),
					storyId: command.story_id,
					type: 'createPassages'
				});
				return;

			case 'setPassageTags': {
				const story = storyForId(this.stories, command.story_id);
				const passage = passageForId(story, command.passage_id);

				dispatch(updatePassage(story, passage, {tags: command.tags}));
				return;
			}

			case 'setStartPassage': {
				const story = storyForId(this.stories, command.story_id);

				dispatch(
					updateStory(this.stories, story, {
						startPassage: command.passage_id
					})
				);
				return;
			}

			case 'updatePassageText': {
				const story = storyForId(this.stories, command.story_id);
				const passage = passageForId(story, command.passage_id);

				dispatch(updatePassage(story, passage, {text: command.text}));
				return;
			}

			case 'updateStoryScript': {
				const story = storyForId(this.stories, command.story_id);

				dispatch(updateStory(this.stories, story, {script: command.script}));
				return;
			}

			case 'updateStoryStylesheet': {
				const story = storyForId(this.stories, command.story_id);

				dispatch(
					updateStory(this.stories, story, {
						stylesheet: command.stylesheet
					})
				);
				return;
			}

			case 'copyAssetSnippet': {
				const snippet =
					command.snippet ??
					this.assetForPath(command.story_id, command.path)?.snippet.text ??
					assetSnippet(command.path).text;

				this.publishPatches('Copy Asset Snippet', [
					{
						path: command.path,
						snippet,
						story_id: command.story_id,
						type: 'assetSnippetCopied'
					}
				]);
				return;
			}

			case 'deleteAsset':
				this.deleteAsset(command.story_id, command.path);

				if (command.remove_references) {
					this.replaceAssetReferencesInStory(
						command.story_id,
						command.path,
						'',
						dispatch
					);
				}

				this.publishAssetInventory(command.story_id, 'Delete Asset', {
					path: projectAssetPath(command.path),
					story_id: command.story_id,
					type: 'assetDeleted'
				});
				return;

			case 'importAsset': {
				const path = projectAssetPath(
					command.target_path ??
						command.source_path.split(/[\\/]/).pop() ??
						'asset'
				);
				const existing = this.assetForPath(command.story_id, path);

				if (existing && !command.overwrite) {
					return;
				}

				const asset = assetInventoryEntry(path);

				this.upsertAsset(command.story_id, asset);
				this.publishAssetInventory(command.story_id, 'Import Asset', {
					asset,
					story_id: command.story_id,
					type: 'assetImported'
				});
				return;
			}

			case 'insertAssetSnippet': {
				const snippet =
					command.snippet ??
					this.assetForPath(command.story_id, command.path)?.snippet.text ??
					assetSnippet(command.path).text;

				this.insertAssetSnippet(
					command.story_id,
					command.source_id,
					command.passage_id,
					command.position,
					snippet,
					dispatch
				);
				this.publishPatches('Insert Asset Snippet', [
					{
						path: command.path,
						snippet,
						source_id: command.source_id,
						story_id: command.story_id,
						type: 'assetSnippetInserted'
					}
				]);
				return;
			}

			case 'renameAsset': {
				const renamed = this.renameAsset(
					command.story_id,
					command.path,
					command.new_path
				);

				if (command.update_references) {
					this.replaceAssetReferencesInStory(
						command.story_id,
						command.path,
						projectAssetPath(command.new_path),
						dispatch
					);
				}

				this.publishAssetInventory(command.story_id, 'Rename Asset', {
					new_path: renamed.path,
					old_path: projectAssetPath(command.path),
					story_id: command.story_id,
					type: 'assetRenamed'
				});
				return;
			}

			case 'replaceAsset': {
				const asset = {
					...(this.assetForPath(command.story_id, command.path) ??
						assetInventoryEntry(projectAssetPath(command.path))),
					modifiedAt: new Date().toISOString()
				};

				this.upsertAsset(command.story_id, asset);
				this.publishAssetInventory(command.story_id, 'Replace Asset', {
					asset,
					story_id: command.story_id,
					type: 'assetReplaced'
				});
				return;
			}

			case 'revealAsset': {
				this.publishPatches('Reveal Asset', [
					{
						path: projectAssetPath(command.path),
						reveal_path: projectAssetPath(command.path),
						story_id: command.story_id,
						type: 'assetRevealed'
					}
				]);
				return;
			}

			case 'validateAssetReferences':
				this.publishAssetInventory(
					command.story_id,
					'Validate Asset References'
				);
				return;

			case 'markSaved':
			case 'queryGraphProjection':
			case 'queryStoryIndex':
			case 'saveGeneratedLayout':
				return;
		}
	}

	private assetForPath(storyId: string, path: string) {
		const normalized = normalizedAssetPath(projectAssetPath(path));

		return this.assetInventoryByStory
			.get(storyId)
			?.find(asset => asset.normalizedPath === normalized);
	}

	private deleteAsset(storyId: string, path: string) {
		const normalized = normalizedAssetPath(projectAssetPath(path));
		const assets = this.assetInventoryByStory.get(storyId) ?? [];

		this.assetInventoryByStory.set(
			storyId,
			assets.filter(asset => asset.normalizedPath !== normalized)
		);
	}

	private insertAssetSnippet(
		storyId: string,
		sourceId: string,
		passageId: string | null,
		position: number,
		snippet: string,
		dispatch: (action: StoriesAction | StoriesActionOrThunk) => void
	) {
		const story = storyForId(this.stories, storyId);
		const passage = passageId
			? passageForId(story, passageId)
			: story.passages.find(passage => passage.id === sourceId);

		if (passage) {
			dispatch(
				updatePassage(story, passage, {
					text: insertAtPosition(passage.text, position, snippet)
				})
			);
			return;
		}

		if (sourceId.endsWith(':script')) {
			dispatch(
				updateStory(this.stories, story, {
					script: insertAtPosition(story.script, position, snippet)
				})
			);
			return;
		}

		if (sourceId.endsWith(':stylesheet')) {
			dispatch(
				updateStory(this.stories, story, {
					stylesheet: insertAtPosition(story.stylesheet, position, snippet)
				})
			);
		}
	}

	private publishAssetInventory(storyId: string, label: string, patch?: Patch) {
		const index = this.queryStoryIndex(storyId);
		const patches: Patch[] = [
			...(patch ? [patch] : []),
			{
				inventory: index.assetInventory,
				story_id: storyId,
				type: 'assetInventoryUpdated'
			},
			{
				index,
				story_id: storyId,
				type: 'storyIndexUpdated'
			}
		];

		this.publishPatches(label, patches);
	}

	private publishPatches(label: string, patches: Patch[]) {
		this.transactionId++;
		this.listeners.forEach(listener =>
			listener({
				label,
				patches,
				transactionId: this.transactionId
			})
		);
	}

	private renameAsset(storyId: string, path: string, newPath: string) {
		const oldAsset = this.assetForPath(storyId, path);
		const renamed = {
			...(oldAsset ?? assetInventoryEntry(projectAssetPath(path))),
			...assetInventoryEntry(projectAssetPath(newPath)),
			references: oldAsset?.references ?? [],
			referenceCount: oldAsset?.referenceCount ?? 0
		};

		this.deleteAsset(storyId, path);
		this.upsertAsset(storyId, renamed);
		return renamed;
	}

	private replaceAssetReferencesInStory(
		storyId: string,
		oldPath: string,
		newPath: string,
		dispatch: (action: StoriesAction | StoriesActionOrThunk) => void
	) {
		const story = storyForId(this.stories, storyId);

		for (const passage of story.passages) {
			const text = replaceAssetReferences(passage.text, oldPath, newPath);

			if (text !== passage.text) {
				dispatch(updatePassage(story, passage, {text}));
			}
		}

		const script = replaceAssetReferences(story.script, oldPath, newPath);

		if (script !== story.script) {
			dispatch(updateStory(this.stories, story, {script}));
		}

		const stylesheet = replaceAssetReferences(
			story.stylesheet,
			oldPath,
			newPath
		);

		if (stylesheet !== story.stylesheet) {
			dispatch(updateStory(this.stories, story, {stylesheet}));
		}
	}

	private upsertAsset(storyId: string, asset: CoreAssetInventoryEntry) {
		const assets = this.assetInventoryByStory.get(storyId) ?? [];
		const withoutAsset = assets.filter(
			existing => existing.normalizedPath !== asset.normalizedPath
		);

		this.assetInventoryByStory.set(storyId, [...withoutAsset, asset]);
	}

	publishStoryIndexPatches() {
		const patches = this.stories
			.filter(story => this.publishedStories.get(story.id) !== story)
			.map(story => ({
				index: this.queryStoryIndex(story.id),
				story_id: story.id,
				type: 'storyIndexUpdated' as const
			}));

		this.publishedStories = new Map(
			this.stories.map(story => [story.id, story])
		);

		if (patches.length > 0) {
			this.transactionId++;
			this.listeners.forEach(listener =>
				listener({
					label: 'store-index-refresh',
					patches,
					transactionId: this.transactionId
				})
			);
		}
	}

	queryStoryIndex(storyId: string, options: StoryIndexQuery = {}) {
		const knownAssets = this.assetInventoryByStory.get(storyId) ?? [];

		if (typeof options === 'string') {
			return storyToCoreIndex(storyForId(this.stories, storyId), {
				knownAssets,
				query: options
			});
		}

		return storyToCoreIndex(storyForId(this.stories, storyId), {
			...options,
			knownAssets: [...(options.knownAssets ?? []), ...knownAssets]
		});
	}

	subscribeToPatches(listener: CoreProjectPatchListener) {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}

	update(stories: StoriesState, dispatch: UndoableDispatch) {
		this.dispatch = dispatch;
		this.stories = stories;
	}
}

export function useCoreProjectHost() {
	const {dispatch, stories} = useUndoableStoriesContext();
	const hostRef = React.useRef<StoreCoreProjectHost>();

	if (!hostRef.current) {
		hostRef.current = new StoreCoreProjectHost(stories, dispatch);
	}

	hostRef.current.update(stories, dispatch);

	React.useEffect(() => {
		hostRef.current?.publishStoryIndexPatches();
	}, [stories]);

	return hostRef.current;
}
