#!/usr/bin/env node
// Clears desktop distribution output before a fresh release build.
import {mkdirSync, rmSync} from 'node:fs';
import {join, resolve} from 'node:path';

const releaseDir = resolve(process.argv[2] || join(process.cwd(), 'release'));

if (releaseDir === resolve(process.cwd())) {
	console.error('clean-release: refusing to remove the project root.');
	process.exit(1);
}

rmSync(releaseDir, {force: true, recursive: true});
mkdirSync(releaseDir, {recursive: true});
console.log(`clean-release: cleared ${releaseDir}`);
