import {join} from 'path';
import type {NativeProjectFolderResult} from './project-folder';
import {
	forgetNativeProjectFolder,
	listRememberedNativeProjectFolders,
	rememberNativeProjectFolder
} from './native';
import {getStoryDirectoryPath} from './story-directory';

export function projectLibraryIndexPath() {
	return join(getStoryDirectoryPath(), '.twine', 'native-projects.json');
}

export function rememberProjectFolder(project: NativeProjectFolderResult) {
	return rememberNativeProjectFolder(projectLibraryIndexPath(), project);
}

export function forgetProjectFolder(rootPath: string) {
	return forgetNativeProjectFolder(projectLibraryIndexPath(), rootPath);
}

export function rememberedProjectFolders() {
	return listRememberedNativeProjectFolders(projectLibraryIndexPath()) ?? [];
}
