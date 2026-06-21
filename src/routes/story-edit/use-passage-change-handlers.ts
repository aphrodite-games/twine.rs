import * as React from 'react';
import {addPassageEditors, useDialogsContext} from '../../dialogs';
import {
	createUntitledPassageCommand,
	movePassagesCommand,
	useCoreProjectHost
} from '../../core';
import {
	deselectPassage,
	Passage,
	selectPassage,
	selectPassagesInRect,
	Story
} from '../../store/stories';
import {useUndoableStoriesContext} from '../../store/undoable-stories';
import {Point, Rect} from '../../util/geometry';

export function usePassageChangeHandlers(story: Story) {
	const selectedPassages = React.useMemo(
		() => story.passages.filter(passage => passage.selected),
		[story.passages]
	);
	const {dispatch: undoableStoriesDispatch} = useUndoableStoriesContext();
	const {dispatch: dialogsDispatch} = useDialogsContext();
	const coreProjectHost = useCoreProjectHost();

	const handleDeselectPassage = React.useCallback(
		(passage: Passage) =>
			undoableStoriesDispatch(deselectPassage(story, passage)),
		[story, undoableStoriesDispatch]
	);

	const handleCreatePassage = React.useCallback(
		(point: Point) =>
			coreProjectHost.applyStoryCommand(
				createUntitledPassageCommand(story, point.left, point.top),
				'undoChange.newPassage'
			),
		[coreProjectHost, story]
	);

	const handleDragPassages = React.useCallback(
		(change: Point) => {
			// Ignore tiny drags--they're probably caused by the user moving their
			// mouse slightly during double-clicking.

			if (Math.abs(change.left) < 1 && Math.abs(change.top) < 1) {
				return;
			}

			coreProjectHost.applyStoryCommand(
				movePassagesCommand(
					story.id,
					selectedPassages.map(passage => {
						let left = Math.max(passage.left + change.left / story.zoom, 0);
						let top = Math.max(passage.top + change.top / story.zoom, 0);

						if (story.snapToGrid) {
							left = Math.round(left / 25) * 25;
							top = Math.round(top / 25) * 25;
						}

						return {
							bounds: {
								height: passage.height,
								left,
								top,
								width: passage.width
							},
							passageId: passage.id
						};
					})
				),
				selectedPassages.length > 1
					? 'undoChange.movePassages'
					: 'undoChange.movePassages'
			);
		},
		[coreProjectHost, selectedPassages, story]
	);

	const handleEditPassage = React.useCallback(
		(passage: Passage) =>
			dialogsDispatch(addPassageEditors(story.id, [passage.id])),
		[dialogsDispatch, story.id]
	);

	const handleSelectPassage = React.useCallback(
		(passage: Passage, exclusive: boolean) =>
			undoableStoriesDispatch(selectPassage(story, passage, exclusive)),
		[story, undoableStoriesDispatch]
	);

	const handleSelectRect = React.useCallback(
		(rect: Rect, additive: boolean) => {
			// The rect we receive is in screen coordinates--we need to convert to
			// logical ones.
			const logicalRect: Rect = {
				height: rect.height / story.zoom,
				left: rect.left / story.zoom,
				top: rect.top / story.zoom,
				width: rect.width / story.zoom
			};

			// This should not be undoable.
			undoableStoriesDispatch(
				selectPassagesInRect(
					story,
					logicalRect,
					additive ? selectedPassages.map(passage => passage.id) : []
				)
			);
		},
		[selectedPassages, story, undoableStoriesDispatch]
	);

	return {
		handleCreatePassage,
		handleDeselectPassage,
		handleDragPassages,
		handleEditPassage,
		handleSelectPassage,
		handleSelectRect
	};
}
