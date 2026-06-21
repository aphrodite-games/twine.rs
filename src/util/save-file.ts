import {saveAs} from 'file-saver';

export function saveFile(
	source: string,
	filename: string,
	type = 'text/plain;charset=utf-8'
) {
	const data = new Blob([source], {type});

	saveAs(data, filename);
}

/**
 * Saves text to an HTML file. This works in either a browser or Electron
 * context.
 */
export function saveHtml(source: string, filename: string) {
	saveFile(source, filename, 'text/html;charset=utf-8');
}

/**
 * Saves text to a Twee file. This works in either a browser or Electron
 * context.
 */
export function saveTwee(source: string, filename: string) {
	saveFile(source, filename, 'text/plain;charset=utf-8');
}
