import {app} from 'electron';
import {join} from 'path';
import {initApp} from './init-app';
import {loadAppPrefs} from './app-prefs';
import {initHardwareAcceleration} from './hardware-acceleration';
import {
	commandLineHelpRequested,
	commandLineHelpText,
	commandLineOpenPaths,
	queueCommandLineOpenPaths
} from './command-line';

const nativeAppName = 'Twine RS';
const nativeUserDataName = 'twine-rs';

app.setName(nativeAppName);
app.setPath('userData', join(app.getPath('appData'), nativeUserDataName));

// We need to load prefs here *and block* because disabling hardware
// acceleration has to happen before the app is ready.
// @see https://github.com/electron/electron/issues/21370

loadAppPrefs();
initHardwareAcceleration();

// Continue initialization that needs to happen after Electron is ready.

const commandLineArgs = process.argv.slice(app.isPackaged ? 1 : 2);

if (commandLineHelpRequested(commandLineArgs)) {
	console.log(commandLineHelpText(app.getName()));
	app.quit();
} else {
	queueCommandLineOpenPaths(commandLineOpenPaths(commandLineArgs));
	app.on('open-file', (event, path) => {
		event.preventDefault();
		queueCommandLineOpenPaths([path]);
	});
	app.whenReady().then(initApp);
	app.on('window-all-closed', () => app.quit());
}
