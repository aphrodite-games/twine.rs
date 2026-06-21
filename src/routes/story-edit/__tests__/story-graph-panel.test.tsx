import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import * as React from 'react';
import {StoreCoreProjectHost} from '../../../core/project-host';
import {StoriesContext} from '../../../store/stories';
import {UndoableStoriesContext} from '../../../store/undoable-stories';
import {fakePassage, fakeStory} from '../../../test-util';
import {StoryGraphPanel} from '../story-graph-panel';

function graphStory(generatedLayout = false) {
	const story = fakeStory(0);
	const invalidLayout = generatedLayout
		? {height: 0, left: Number.NaN, top: Number.NaN, width: 0}
		: {};
	const start = fakePassage({
		height: 100,
		id: 'start',
		left: 0,
		name: 'Start',
		selected: false,
		story: story.id,
		tags: ['scene'],
		text: 'Go to [[Next]] and [[Missing]]',
		top: 0,
		width: 100,
		...invalidLayout
	});
	const next = fakePassage({
		height: 100,
		id: 'next',
		left: 160,
		name: 'Next',
		selected: false,
		story: story.id,
		text: '',
		top: 0,
		width: 100,
		...invalidLayout
	});

	story.passages = [start, next];
	story.startPassage = start.id;
	story.tagColors = {scene: 'red'};
	story.zoom = 1;
	return {next, start, story};
}

function renderComponent(
	generatedLayout = false,
	configure?: (context: ReturnType<typeof graphStory>) => void
) {
	const {next, start, story} = graphStory(generatedLayout);

	configure?.({next, start, story});

	const onCreate = jest.fn();
	const onDeselect = jest.fn();
	const onEdit = jest.fn();
	const onSelect = jest.fn();
	const storiesDispatch = jest.fn();
	const undoableDispatch = jest.fn();
	const result = render(
		<StoriesContext.Provider
			value={{dispatch: storiesDispatch, stories: [story]}}
		>
			<UndoableStoriesContext.Provider
				value={{
					dispatch: undoableDispatch,
					isUndoable: true,
					stories: [story]
				}}
			>
				<StoryGraphPanel
					onCreate={onCreate}
					onDeselect={onDeselect}
					onEdit={onEdit}
					onSelect={onSelect}
					selectedPassageId={start.id}
					story={story}
					visibleZoom={1}
					zoom={1}
				/>
			</UndoableStoriesContext.Provider>
		</StoriesContext.Provider>
	);

	return {
		next,
		onCreate,
		onDeselect,
		onEdit,
		onSelect,
		result,
		start,
		storiesDispatch,
		story,
		undoableDispatch
	};
}

function nodeButton(container: HTMLElement, passageId: string) {
	return container.querySelector(
		`[data-passage-id="${passageId}"] .tw-node`
	) as HTMLElement;
}

describe('<StoryGraphPanel>', () => {
	afterEach(() => jest.restoreAllMocks());

	it('renders passage nodes and projected link edges', () => {
		const {result} = renderComponent();

		expect(screen.getByRole('button', {name: /Start/})).toBeInTheDocument();
		expect(nodeButton(result.container, 'next')).toHaveTextContent('Next');
		expect(screen.getByText('saved')).toBeInTheDocument();
		expect(result.container.querySelector('[data-kind="resolved"]')).toBeTruthy();
		expect(result.container.querySelector('[data-kind="broken"]')).toBeTruthy();
	});

	it('updates link layers from graph toolbar buttons', () => {
		const {result} = renderComponent();

		fireEvent.click(screen.getByRole('button', {name: 'Broken links'}));

		expect(result.container.querySelector('[data-kind="resolved"]')).toBeTruthy();
		expect(result.container.querySelector('[data-kind="broken"]')).toBeNull();
	});

	it('passes the measured viewport into graph projection queries', async () => {
		const widthSpy = jest
			.spyOn(HTMLElement.prototype, 'clientWidth', 'get')
			.mockReturnValue(320);
		const heightSpy = jest
			.spyOn(HTMLElement.prototype, 'clientHeight', 'get')
			.mockReturnValue(240);
		const querySpy = jest.spyOn(
			StoreCoreProjectHost.prototype,
			'queryGraphProjection'
		);
		const {story} = renderComponent();

		await waitFor(() =>
			expect(querySpy).toHaveBeenCalledWith(
				story.id,
				expect.objectContaining({
					viewport: expect.objectContaining({
						height: 240,
						left: 0,
						top: 0,
						width: 320
					})
				})
			)
		);

		widthSpy.mockRestore();
		heightSpy.mockRestore();
	});

	it('focuses every selected passage when graph focus is enabled', async () => {
		const querySpy = jest.spyOn(
			StoreCoreProjectHost.prototype,
			'queryGraphProjection'
		);
		const {start, story} = renderComponent(false, ({next, start}) => {
			start.selected = true;
			next.selected = true;
		});

		fireEvent.click(
			screen.getByRole('button', {name: 'Focus selected passages'})
		);

		await waitFor(() =>
			expect(querySpy).toHaveBeenCalledWith(
				story.id,
				expect.objectContaining({
					focus: expect.objectContaining({
						direction: 'both',
						passageIds: [start.id, 'next'],
						radius: 1
					}),
					viewport: null
				})
			)
		);
	});

	it('selects, edits, and creates passages from graph interactions', () => {
		const {next, onCreate, onEdit, onSelect, result} = renderComponent();
		const nextNode = nodeButton(result.container, 'next');

		fireEvent.click(nextNode);
		expect(onSelect).toHaveBeenCalledWith(next, true);

		fireEvent.doubleClick(nextNode);
		expect(onEdit).toHaveBeenCalledWith(next);

		fireEvent.doubleClick(
			result.container.querySelector('.story-edit-graph-viewport')!,
			{clientX: 220, clientY: 180}
		);
		expect(onCreate).toHaveBeenCalledWith({left: 220, top: 180});
	});

	it('saves generated layout through the core project host', () => {
		const {story, undoableDispatch} = renderComponent(true);

		fireEvent.click(screen.getByRole('button', {name: /Save Layout/}));

		expect(undoableDispatch).toHaveBeenCalledWith(
			{
				passageUpdates: {
					next: expect.objectContaining({
						height: 110,
						left: 424,
						top: 0,
						width: 184
					}),
					start: expect.objectContaining({
						height: 110,
						left: 0,
						top: 0,
						width: 184
					})
				},
				storyId: story.id,
				type: 'updatePassages'
			},
			'undoChange.movePassage'
		);
	});
});
