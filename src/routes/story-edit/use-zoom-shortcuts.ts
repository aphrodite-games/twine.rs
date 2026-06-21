import {useHotkeys} from 'react-hotkeys-hook';
import {setStoryZoomCommand, useCoreProjectHost} from '../../core';
import {Story} from '../../store/stories';

export function useZoomShortcuts(story: Story) {
	const coreProjectHost = useCoreProjectHost();

	const setZoom = (zoom: number) =>
		coreProjectHost.applyStoryCommand(setStoryZoomCommand(story.id, zoom));

	useHotkeys(
		'-',
		() => {
			switch (story.zoom) {
				case 1:
					setZoom(0.6);
					break;
				case 0.6:
					setZoom(0.3);
					break;
				// Do nothing if zoom is 0.3
			}
		},
		{keydown: false, keyup: true},
		[coreProjectHost, story]
	);
	useHotkeys(
		'=',
		() => {
			switch (story.zoom) {
				case 0.3:
					setZoom(0.6);
					break;
				case 0.6:
					setZoom(1);
					break;
				// Do nothing if zoom is 1
			}
		},
		{keydown: false, keyup: true},
		[coreProjectHost, story]
	);
}
