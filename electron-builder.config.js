const {execFileSync} = require('child_process');
const {notarize} = require('@electron/notarize');
const path = require('path');
const pkg = require('./package.json');

const isPreview =
	/alpha|beta|pre/.test(pkg.version) || process.env.FORCE_PREVIEW;
const productName = 'Twine RS';
const artifactProductName = 'Twine-RS';

function macAppPath(context) {
	return path.join(
		context.appOutDir,
		`${context.packager.appInfo.productFilename || productName}.app`
	);
}

module.exports = {
	async afterSign(context) {
		if (context.packager.platform.name === 'mac') {
			const missingNotarizationEnv = [
				'APPLE_APP_ID',
				'APPLE_ID',
				'APPLE_ID_PASSWORD',
				'APPLE_TEAM_ID'
			].filter(key => !(key in process.env));
			const appPath = macAppPath(context);

			if (missingNotarizationEnv.length > 0) {
				console.log(
					`${missingNotarizationEnv.join(
						', '
					)} environment variable(s) are not set, skipping notarization`
				);
				console.log('Ad hoc signing Mac app for local file access identity...');
				execFileSync('/usr/bin/codesign', [
					'--force',
					'--deep',
					'--sign',
					'-',
					appPath
				]);
				return;
			}

			console.log('Notarizing Mac app...');
			await notarize({
				appBundleId: process.env.APPLE_APP_ID,
				appPath,
				appleId: process.env.APPLE_ID,
				appleIdPassword: process.env.APPLE_ID_PASSWORD,
				teamId: process.env.APPLE_TEAM_ID
			});
		}
	},

	// This step was necessary to ad hoc sign the app. Otherwise, on Apple Silicon
	// you get repeated prompts for file access. This is commented out because we
	// are able to sign the app thanks to the Interactive Fiction Technology
	// Foundation, but originally figuring this problem out took forever, so the
	// code below might be helpful to others making builds.
	// The code below was cribbed from https://github.com/alacritty/alacritty/issues/5840.
	//
	// afterSign(context) {
	// 	if (context.packager.platform.name === 'mac') {
	// 		console.log('Ad hoc signing Mac app...');
	// 		child_process.execSync(
	// 			'codesign --force --deep --sign - "release/mac-universal/Twine RS.app"'
	// 		);
	// 	}
	// },
	appId: 'rs.twine.app',
	productName,
	directories: {
		output: 'release'
	},
	extraMetadata: {
		main: 'electron-build/main/src/electron/main-process/index.js',
		name: 'twine-rs',
		productName
	},
	files: ['electron-build/**/*', 'node_modules/**/*'],
	dmg: {
		writeUpdateInfo: false
	},
	linux: {
		artifactName: `${artifactProductName}-${pkg.version}-linux-\${arch}.\${ext}`,
		category: 'Development',
		icon: `icons/app-${isPreview ? 'preview' : 'release'}.png`,
		target: [
			{arch: ['arm64', 'x64'], target: 'AppImage'},
			{arch: ['arm64', 'x64'], target: 'zip'}
		]
	},
	mac: {
		artifactName: `${artifactProductName}-${pkg.version}-mac-universal.\${ext}`,
		category: 'public.app-category.developer-tools',
		icon: `icons/app-${isPreview ? 'preview' : 'release'}.png`,
		target: {arch: ['universal'], target: 'dmg'}
	},
	nsis: {
		oneClick: false,
		allowToChangeInstallationDirectory: true
	},
	win: {
		artifactName: `${artifactProductName}-${pkg.version}-win-\${arch}.\${ext}`,
		icon: `icons/app-${isPreview ? 'preview' : 'release'}-no-padding.ico`,
		target: {arch: ['x64'], target: 'nsis'}
	}
};
