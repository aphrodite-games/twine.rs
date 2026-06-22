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
import {fakeStory} from '../../../test-util';
import {
	chooseAssetFile,
	copyAssetToProject,
	createProjectFolder,
	deleteProjectAsset,
	listProjectAssets,
	openProjectFolder,
	renameProjectAsset,
	replaceProjectAsset,
	saveProjectFolder
} from '../project-folder';

jest.mock('electron');
jest.mock('fs-extra');
jest.mock('../story-directory', () => ({
	getStoryDirectoryPath: () => 'mock-story-library'
}));

describe('project-folder native bridge', () => {
	const mkdirpMock = mkdirp as jest.Mock;
	const copyMock = copy as jest.Mock;
	const moveMock = move as jest.Mock;
	const readJsonMock = readJson as jest.Mock;
	const readdirMock = readdir as jest.Mock;
	const removeMock = remove as jest.Mock;
	const createFromPathMock = nativeImage.createFromPath as jest.Mock;
	const showOpenDialogMock = dialog.showOpenDialog as jest.Mock;
	const statMock = stat as jest.Mock;
	const writeFileMock = writeFile as jest.Mock;
	const writeJsonMock = writeJson as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		writeFileMock.mockResolvedValue(undefined);
		writeJsonMock.mockResolvedValue(undefined);
		copyMock.mockResolvedValue(undefined);
		moveMock.mockResolvedValue(undefined);
		removeMock.mockResolvedValue(undefined);
		mkdirpMock.mockResolvedValue(undefined);
		createFromPathMock.mockReturnValue({
			getSize: () => ({height: 480, width: 640})
		});
	});

	it('creates a native project folder with manifest, source files, and metadata', async () => {
		const story = {
			...fakeStory(1),
			id: 'story-id',
			name: 'Moon Castle'
		};

		const result = await createProjectFolder(story);

		expect(result.rootPath).toBe('mock-story-library/Projects/moon-castle.twine.rs');
		expect(mkdirpMock).toHaveBeenCalledWith(
			'mock-story-library/Projects/moon-castle.twine.rs/assets'
		);
		expect(writeFileMock).toHaveBeenCalledWith(
			'mock-story-library/Projects/moon-castle.twine.rs/twine.toml',
			expect.stringContaining('Native twine.rs desktop project folder'),
			'utf8'
		);
		expect(writeJsonMock).toHaveBeenCalledWith(
			'mock-story-library/Projects/moon-castle.twine.rs/.twine/project.json',
			expect.objectContaining({
				schema: 'twine.rs/renderer-project',
				stories: [story]
			})
		);
	});

	it('saves an existing native project folder in place', async () => {
		const story = {
			...fakeStory(1),
			id: 'story-id',
			name: 'Moon Castle'
		};

		const result = await saveProjectFolder('/native/moon-castle.twine.rs', story);

		expect(result.rootPath).toBe('/native/moon-castle.twine.rs');
		expect(writeJsonMock).toHaveBeenCalledWith(
			'/native/moon-castle.twine.rs/.twine/project.json',
			expect.objectContaining({
				schema: 'twine.rs/renderer-project',
				stories: [story]
			})
		);
		expect(writeFileMock).toHaveBeenCalledWith(
			'/native/moon-castle.twine.rs/twine.toml',
			expect.stringContaining('Moon Castle'),
			'utf8'
		);
	});

	it('opens a native project folder from renderer metadata', async () => {
		const story = fakeStory(1);

		showOpenDialogMock.mockResolvedValue({
			canceled: false,
			filePaths: ['/native/moon-castle.twine.rs']
		});
		readJsonMock.mockResolvedValue({
			stories: [{...story, lastUpdate: story.lastUpdate.toISOString()}]
		});

		const result = await openProjectFolder();

		expect(result).toEqual(
			expect.objectContaining({
				rootPath: '/native/moon-castle.twine.rs',
				storyIds: [story.id]
			})
		);
		expect(result?.stories[0].lastUpdate).toBeInstanceOf(Date);
	});

	it('returns undefined when opening a project folder is canceled', async () => {
		showOpenDialogMock.mockResolvedValue({canceled: true, filePaths: []});

		await expect(openProjectFolder()).resolves.toBeUndefined();
	});

	it('chooses an asset file with a native dialog', async () => {
		showOpenDialogMock.mockResolvedValue({
			canceled: false,
			filePaths: ['/native/assets/cover.png']
		});

		await expect(chooseAssetFile('/native/assets')).resolves.toBe(
			'/native/assets/cover.png'
		);
		expect(showOpenDialogMock).toHaveBeenCalledWith(
			expect.objectContaining({
				defaultPath: '/native/assets',
				properties: ['openFile']
			})
		);
	});

	it('copies an asset into the native project assets folder', async () => {
		await expect(
			copyAssetToProject('/native/project.twine.rs', '/tmp/cover.png')
		).resolves.toEqual({
			sourcePath: '/native/project.twine.rs/assets/cover.png',
			targetPath: 'assets/cover.png'
		});
		expect(mkdirpMock).toHaveBeenCalledWith('/native/project.twine.rs/assets');
		expect(copyMock).toHaveBeenCalledWith(
			'/tmp/cover.png',
			'/native/project.twine.rs/assets/cover.png',
			{overwrite: true}
		);
	});

	it('lists native project assets with file metadata and preview URLs', async () => {
		const mtime = new Date('2026-06-21T16:00:00.000Z');

		readdirMock.mockImplementation(async path => {
			if (path === '/native/project.twine.rs/assets') {
				return ['cover.png', 'audio'];
			}

			if (path === '/native/project.twine.rs/assets/audio') {
				return ['theme.mp3'];
			}

			return [];
		});
		statMock.mockImplementation(async path => ({
			isDirectory: () => path.endsWith('/audio'),
			isFile: () => !path.endsWith('/audio'),
			mtime,
			size: path.endsWith('.mp3') ? 4096 : 2048
		}));

		await expect(listProjectAssets('/native/project.twine.rs')).resolves.toEqual([
			expect.objectContaining({
				height: null,
				kind: 'audio',
				path: 'assets/audio/theme.mp3',
				sizeBytes: 4096,
				thumbnailUrl: null,
				width: null
			}),
			expect.objectContaining({
				height: 480,
				kind: 'image',
				modifiedAt: '2026-06-21T16:00:00.000Z',
				path: 'assets/cover.png',
				sizeBytes: 2048,
				thumbnailUrl: 'file:///native/project.twine.rs/assets/cover.png',
				width: 640
			})
		]);
	});

	it('returns an empty asset inventory when the project assets folder is absent', async () => {
		readdirMock.mockRejectedValue(Object.assign(new Error('missing'), {
			code: 'ENOENT'
		}));

		await expect(listProjectAssets('/native/project.twine.rs')).resolves.toEqual(
			[]
		);
	});

	it('renames, replaces, and deletes native project asset files safely', async () => {
		await expect(
			renameProjectAsset(
				'/native/project.twine.rs',
				'assets/cover.png',
				'assets/hero.png'
			)
		).resolves.toEqual({
			sourcePath: '/native/project.twine.rs/assets/hero.png',
			targetPath: 'assets/hero.png'
		});
		expect(mkdirpMock).toHaveBeenCalledWith('/native/project.twine.rs/assets');
		expect(moveMock).toHaveBeenCalledWith(
			'/native/project.twine.rs/assets/cover.png',
			'/native/project.twine.rs/assets/hero.png',
			{overwrite: true}
		);

		await expect(
			replaceProjectAsset(
				'/native/project.twine.rs',
				'assets/hero.png',
				'/tmp/new-hero.png'
			)
		).resolves.toEqual({
			sourcePath: '/native/project.twine.rs/assets/hero.png',
			targetPath: 'assets/hero.png'
		});
		expect(copyMock).toHaveBeenCalledWith(
			'/tmp/new-hero.png',
			'/native/project.twine.rs/assets/hero.png',
			{overwrite: true}
		);

		await deleteProjectAsset('/native/project.twine.rs', 'assets/hero.png');
		expect(removeMock).toHaveBeenCalledWith(
			'/native/project.twine.rs/assets/hero.png'
		);
	});

	it('rejects unsafe native project asset paths', async () => {
		await expect(
			deleteProjectAsset('/native/project.twine.rs', '../outside.png')
		).rejects.toThrow('Unsafe project asset path');
	});
});
