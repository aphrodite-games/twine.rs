export interface ProjectMetadata {
	createdAt: string;
	rootPath?: string;
	status: 'file-backed' | 'local-only';
	storageKind: 'electron-project-folder' | 'web-local';
	storyId: string;
	updatedAt: string;
}

export function projectFolderSlug(value: string) {
	return (
		value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9._-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 80) || 'untitled-story'
	);
}

export function defaultProjectFolderRoot(
	storyLibraryFolder: string,
	storyName: string
) {
	return `${storyLibraryFolder.replace(/[\\/]+$/, '')}/Projects/${projectFolderSlug(
		storyName
	)}.twine.rs`;
}

function projectMetadataKey(storyId: string) {
	return `twine-rs-project-metadata-${storyId}`;
}

export function saveProjectMetadata(
	storyId: string,
	metadata: Omit<ProjectMetadata, 'createdAt' | 'storyId' | 'updatedAt'> &
		Partial<Pick<ProjectMetadata, 'createdAt'>>
) {
	const now = new Date().toISOString();

	window.localStorage.setItem(
		projectMetadataKey(storyId),
		JSON.stringify({
			...metadata,
			createdAt: metadata.createdAt ?? now,
			storyId,
			updatedAt: now
		})
	);
}

export function loadProjectMetadata(storyId: string) {
	const raw = window.localStorage.getItem(projectMetadataKey(storyId));

	if (!raw) {
		return undefined;
	}

	try {
		return JSON.parse(raw) as ProjectMetadata;
	} catch {
		return undefined;
	}
}
