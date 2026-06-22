import {dialog, nativeImage} from 'electron';
import {
	copy,
	mkdirp,
	move,
	readJson,
	readdir,
	remove,
	stat,
	writeFile,
	writeJson
} from 'fs-extra';
import {basename, dirname, join, relative, resolve} from 'path';
import type {CoreAssetInventoryEntry} from '../../core';
import {
	assetKindForPath,
	assetSnippet,
	fileUrlForPath,
	localAssetReferencePath,
	normalizedAssetPath
} from '../../core/asset-paths';
import {Story} from '../../store/stories';
import {getStoryDirectoryPath} from './story-directory';

export interface NativeProjectFolderResult {
	rootPath: string;
	stories: Story[];
	storyIds: string[];
}

export interface NativeProjectAssetWriteResult {
	sourcePath: string;
	targetPath: string;
}

function pathSlug(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'untitled-story'
	);
}

function tomlString(value: string) {
	return JSON.stringify(value ?? '');
}

function tomlStringArray(values: string[]) {
	return `[${values.map(tomlString).join(', ')}]`;
}

function projectRootForStory(story: Story, preferredParent?: string) {
	const parent = preferredParent?.trim()
		? preferredParent.trim()
		: join(getStoryDirectoryPath(), 'Projects');
	const folderName = `${pathSlug(story.name)}.twine.rs`;

	return basename(parent) === folderName ? parent : join(parent, folderName);
}

function passageFileName(index: number, passageName: string) {
	return `${String(index + 1).padStart(3, '0')}-${pathSlug(passageName)}.twee`;
}

function projectToml(story: Story, passageFiles: string[]) {
	const storySlug = pathSlug(story.name);
	const lastUpdate =
		story.lastUpdate instanceof Date
			? story.lastUpdate
			: new Date(story.lastUpdate);
	const lines = [
		'schema_version = 1',
		'app_version = "twine.rs-desktop"',
		`name = ${tomlString(story.name)}`,
		'',
		'[storage]',
		'kind = "project-folder"',
		'message = "Native twine.rs desktop project folder"',
		'',
		'[library]',
		`sort_order = ${tomlStringArray([story.id])}`,
		'',
		'[[stories]]',
		`id = ${tomlString(story.id)}`,
		`ifid = ${tomlString(story.ifid)}`,
		`last_update = ${tomlString(lastUpdate.toISOString())}`,
		`name = ${tomlString(story.name)}`,
		`script = ${tomlString(`scripts/${storySlug}.js`)}`,
		`snap_to_grid = ${story.snapToGrid ? 'true' : 'false'}`,
		`start_passage = ${tomlString(story.startPassage)}`,
		`story_format = ${tomlString(story.storyFormat)}`,
		`story_format_version = ${tomlString(story.storyFormatVersion)}`,
		`stylesheet = ${tomlString(`styles/${storySlug}.css`)}`,
		`tags = ${tomlStringArray(story.tags)}`,
		`zoom = ${story.zoom}`,
		''
	];

	for (const [index, passage] of story.passages.entries()) {
		lines.push(
			'[[stories.passages]]',
			`id = ${tomlString(passage.id)}`,
			`name = ${tomlString(passage.name)}`,
			`file = ${tomlString(passageFiles[index])}`,
			`tags = ${tomlStringArray(passage.tags)}`,
			''
		);
	}

	return `${lines.join('\n')}\n`;
}

function graphLayout(story: Story) {
	return {
		passages: Object.fromEntries(
			story.passages.map(passage => [
				passage.id,
				{
					height: passage.height,
					left: passage.left,
					top: passage.top,
					width: passage.width
				}
			])
		)
	};
}

function reviveStory(story: Story): Story {
	return {
		...story,
		lastUpdate: new Date(story.lastUpdate)
	};
}

function safeProjectAssetPath(rootPath: string, assetPath: string) {
	const projectPath = localAssetReferencePath(assetPath);

	if (!projectPath) {
		throw new Error(`Unsafe project asset path "${assetPath}".`);
	}

	const assetRoot = resolve(rootPath, 'assets');
	const absolutePath = resolve(rootPath, projectPath);
	const relativePath = relative(assetRoot, absolutePath);

	if (relativePath === '' || relativePath.startsWith('..')) {
		throw new Error(`Unsafe project asset path "${assetPath}".`);
	}

	return {absolutePath, projectPath};
}

function projectAssetInventoryEntry(
	projectPath: string,
	absolutePath: string,
	fileStats: Awaited<ReturnType<typeof stat>>
): CoreAssetInventoryEntry {
	const kind = assetKindForPath(projectPath);
	const previewUrl = fileUrlForPath(absolutePath);
	const imageSize =
		kind === 'image' ? nativeImage.createFromPath(absolutePath).getSize() : null;
	const width = imageSize?.width || null;
	const height = imageSize?.height || null;

	return {
		durationMs: null,
		exists: true,
		height,
		kind,
		missing: false,
		modifiedAt: fileStats.mtime.toISOString(),
		normalizedPath: normalizedAssetPath(projectPath),
		path: projectPath,
		previewUrl,
		publish: {
			copy: true,
			outputPath: projectPath,
			reason: 'Copy asset into published output'
		},
		referenceCount: 0,
		references: [],
		sizeBytes: fileStats.size,
		snippet: assetSnippet(projectPath, kind),
		thumbnailUrl: kind === 'image' ? previewUrl : null,
		unused: true,
		width
	};
}

async function scanAssetDirectory(
	rootPath: string,
	directory: string,
	assets: CoreAssetInventoryEntry[]
) {
	let names: string[];

	try {
		names = await readdir(directory);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return;
		}

		throw error;
	}

	for (const name of names) {
		const absolutePath = join(directory, name);
		const fileStats = await stat(absolutePath);

		if (fileStats.isDirectory()) {
			await scanAssetDirectory(rootPath, absolutePath, assets);
			continue;
		}

		if (!fileStats.isFile()) {
			continue;
		}

		const assetPath = `assets/${relative(
			join(rootPath, 'assets'),
			absolutePath
		).replace(/\\/g, '/')}`;

		assets.push(
			projectAssetInventoryEntry(assetPath, absolutePath, fileStats)
		);
	}
}

export async function createProjectFolder(
	story: Story,
	preferredParent?: string
): Promise<NativeProjectFolderResult> {
	const rootPath = projectRootForStory(story, preferredParent);

	await writeProjectFolder(rootPath, story);

	return {
		rootPath,
		stories: [story],
		storyIds: [story.id]
	};
}

export async function saveProjectFolder(
	rootPath: string,
	story: Story
): Promise<NativeProjectFolderResult> {
	await writeProjectFolder(rootPath, story);

	return {
		rootPath,
		stories: [story],
		storyIds: [story.id]
	};
}

async function writeProjectFolder(rootPath: string, story: Story) {
	const storySlug = pathSlug(story.name);
	const passageRoot = join(rootPath, 'passages', storySlug);
	const passageFiles = story.passages.map(
		(passage, index) =>
			`passages/${storySlug}/${passageFileName(index, passage.name)}`
	);

	await mkdirp(passageRoot);
	await mkdirp(join(rootPath, 'scripts'));
	await mkdirp(join(rootPath, 'styles'));
	await mkdirp(join(rootPath, 'assets'));
	await mkdirp(join(rootPath, '.twine'));

	await Promise.all(
		story.passages.map((passage, index) =>
			writeFile(join(rootPath, passageFiles[index]), passage.text, 'utf8')
		)
	);
	await writeFile(
		join(rootPath, 'scripts', `${storySlug}.js`),
		story.script,
		'utf8'
	);
	await writeFile(
		join(rootPath, 'styles', `${storySlug}.css`),
		story.stylesheet,
		'utf8'
	);
	await writeFile(
		join(rootPath, '.twine', 'graph.json'),
		JSON.stringify(graphLayout(story), null, 2),
		'utf8'
	);
	await writeJson(join(rootPath, '.twine', 'project.json'), {
		schema: 'twine.rs/renderer-project',
		version: 1,
		stories: [story]
	});
	await writeFile(
		join(rootPath, 'twine.toml'),
		projectToml(story, passageFiles),
		'utf8'
	);
}

export async function openProjectFolder(): Promise<
	NativeProjectFolderResult | undefined
> {
	const {canceled, filePaths} = await dialog.showOpenDialog({
		properties: ['openDirectory'],
		title: 'Open Project Folder'
	});

	if (canceled || !filePaths[0]) {
		return undefined;
	}

	const rootPath = filePaths[0];
	const data = await readJson(join(rootPath, '.twine', 'project.json'));
	const stories = ((data.stories ?? []) as Story[]).map(reviveStory);

	return {
		rootPath,
		stories,
		storyIds: stories.map(story => story.id)
	};
}

export async function chooseAssetFile(defaultPath?: string) {
	const {canceled, filePaths} = await dialog.showOpenDialog({
		defaultPath: defaultPath?.trim() || undefined,
		properties: ['openFile'],
		title: 'Choose Asset'
	});

	return canceled ? undefined : filePaths[0];
}

export async function listProjectAssets(rootPath: string) {
	const assets: CoreAssetInventoryEntry[] = [];

	await scanAssetDirectory(rootPath, join(rootPath, 'assets'), assets);

	return assets.sort((left, right) => left.path.localeCompare(right.path));
}

export async function copyAssetToProject(
	rootPath: string,
	sourcePath: string
): Promise<NativeProjectAssetWriteResult> {
	const filename = basename(sourcePath);
	const targetPath = `assets/${filename}`;
	const destinationPath = join(rootPath, targetPath);

	await mkdirp(join(rootPath, 'assets'));
	await copy(sourcePath, destinationPath, {overwrite: true});

	return {
		sourcePath: destinationPath,
		targetPath
	};
}

export async function renameProjectAsset(
	rootPath: string,
	oldPath: string,
	newPath: string
): Promise<NativeProjectAssetWriteResult> {
	const oldAsset = safeProjectAssetPath(rootPath, oldPath);
	const newAsset = safeProjectAssetPath(rootPath, newPath);

	await mkdirp(dirname(newAsset.absolutePath));
	await move(oldAsset.absolutePath, newAsset.absolutePath, {overwrite: true});

	return {
		sourcePath: newAsset.absolutePath,
		targetPath: newAsset.projectPath
	};
}

export async function replaceProjectAsset(
	rootPath: string,
	path: string,
	sourcePath: string
): Promise<NativeProjectAssetWriteResult> {
	const asset = safeProjectAssetPath(rootPath, path);

	await mkdirp(dirname(asset.absolutePath));
	await copy(sourcePath, asset.absolutePath, {overwrite: true});

	return {
		sourcePath: asset.absolutePath,
		targetPath: asset.projectPath
	};
}

export async function deleteProjectAsset(rootPath: string, path: string) {
	const asset = safeProjectAssetPath(rootPath, path);

	await remove(asset.absolutePath);
}
