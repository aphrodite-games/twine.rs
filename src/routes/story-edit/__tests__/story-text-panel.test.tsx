import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import * as React from 'react';
import {
	FakeStateProvider,
	FakeStateProviderProps,
	fakeStory,
	StoryInspector
} from '../../../test-util';
import {StoreCoreProjectHost} from '../../../core/project-host';
import {storyToCoreIndex} from '../../../core/story-index';
import {StoryTextPanel} from '../story-text-panel';

jest.mock('../../../components/control/source-editor', () => ({
	SourceEditor: (props: {
		id: string;
		label: string;
		onChange: (value: string) => void;
		searchRequestKey?: number;
		value: string;
	}) => (
		<textarea
			aria-label={props.label}
			data-search-request-key={props.searchRequestKey}
			data-testid={props.id}
			onChange={event => props.onChange(event.currentTarget.value)}
			value={props.value}
		/>
	)
}));
jest.mock('../../../components/tag/tag-card-button');

describe('<StoryTextPanel>', () => {
	let applyStoryCommandSpy: jest.SpyInstance;

	function renderComponent(
		contexts?: FakeStateProviderProps,
		props?: Partial<React.ComponentProps<typeof StoryTextPanel>>
	) {
		const story = contexts?.stories?.[0] ?? fakeStory(2);

		render(
			<FakeStateProvider {...contexts} stories={[story]}>
				<StoryTextPanel
					selectedPassageId={story.passages[0]?.id}
					story={story}
					{...props}
				/>
				<StoryInspector />
			</FakeStateProvider>
		);

		return story;
	}

	beforeEach(() => {
		jest.useFakeTimers();
		applyStoryCommandSpy = jest
			.spyOn(StoreCoreProjectHost.prototype, 'applyStoryCommand')
			.mockImplementation(() => undefined);
	});

	afterEach(() => {
		act(() => jest.runOnlyPendingTimers());
		applyStoryCommandSpy.mockRestore();
		jest.useRealTimers();
	});

	it('sends passage text updates through the core project host', () => {
		const story = renderComponent();

		fireEvent.change(
			screen.getByLabelText('dialogs.passageEdit.passageTextEditorLabel'),
			{target: {value: 'mock-passage-change'}}
		);
		act(() => jest.advanceTimersByTime(300));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			passage_id: story.passages[0].id,
			story_id: story.id,
			text: 'mock-passage-change',
			type: 'updatePassageText'
		});
	});

	it('sends story JavaScript updates through the core project host', () => {
		const story = renderComponent();

		fireEvent.click(
			screen.getByRole('tab', {name: 'routes.storyEdit.toolbar.javaScript'})
		);
		fireEvent.change(
			screen.getByLabelText('dialogs.passageEdit.passageTextEditorLabel'),
			{target: {value: 'mock-script-change'}}
		);
		act(() => jest.advanceTimersByTime(300));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			script: 'mock-script-change',
			story_id: story.id,
			type: 'updateStoryScript'
		});
	});

	it('sends story stylesheet updates through the core project host', () => {
		const story = renderComponent();

		fireEvent.click(
			screen.getByRole('tab', {name: 'routes.storyEdit.toolbar.stylesheet'})
		);
		fireEvent.change(
			screen.getByLabelText('dialogs.passageEdit.passageTextEditorLabel'),
			{target: {value: 'mock-stylesheet-change'}}
		);
		act(() => jest.advanceTimersByTime(300));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			story_id: story.id,
			stylesheet: 'mock-stylesheet-change',
			type: 'updateStoryStylesheet'
		});
	});

	it('runs inline diagnostic quick fixes through the core project host', async () => {
		const story = fakeStory(1);

		story.passages[0].text = 'Go to [[Missing]].';
		renderComponent({stories: [story]}, {index: storyToCoreIndex(story)});

		fireEvent.click(screen.getByRole('button', {name: 'Create "Missing"'}));

		await waitFor(() =>
			expect(applyStoryCommandSpy).toHaveBeenCalledWith({
				id: null,
				layout: null,
				name: 'Missing',
				story_id: story.id,
				tags: [],
				text: '',
				type: 'createPassage'
			})
		);
	});

	it('tests the selected passage from the text header', () => {
		const onTestPassage = jest.fn();
		const story = renderComponent(undefined, {onTestPassage});

		fireEvent.click(
			screen.getByRole('button', {
				name: 'routes.storyEdit.toolbar.testFromHere'
			})
		);

		expect(onTestPassage).toHaveBeenCalledWith(story.passages[0]);
	});

	it('opens source search from the text header', () => {
		const story = renderComponent();
		const editor = screen.getByTestId(
			`story-text-source-editor-${story.passages[0].id}`
		);

		expect(editor).toHaveAttribute('data-search-request-key', '0');

		fireEvent.click(
			screen.getByRole('button', {
				name: 'routes.storyEdit.workspace.findInEditor'
			})
		);

		expect(editor).toHaveAttribute('data-search-request-key', '1');
	});

	it('edits passage tags from the text header', () => {
		const story = fakeStory(2);

		story.passages[0].tags = ['one'];
		story.passages[1].tags = ['two'];
		renderComponent({stories: [story]});

		expect(screen.getByTestId('mock-tag-card-button')).toHaveAttribute(
			'data-all-tags',
			'one,two'
		);
		expect(screen.getByTestId('mock-tag-card-button')).toHaveAttribute(
			'data-tags',
			'one'
		);

		fireEvent.click(screen.getByText('onAdd'));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			commands: [
				expect.objectContaining({
					color: expect.any(String),
					name: 'mock-tag-name',
					story_id: story.id,
					type: 'setStoryTagColor'
				}),
				{
					passage_id: story.passages[0].id,
					story_id: story.id,
					tags: ['one', 'mock-tag-name'],
					type: 'setPassageTags'
				}
			],
			type: 'batch'
		});

		fireEvent.click(screen.getByText('onRemove'));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			passage_id: story.passages[0].id,
			story_id: story.id,
			tags: ['one'],
			type: 'setPassageTags'
		});

		fireEvent.click(screen.getByText('onChangeColor'));

		expect(applyStoryCommandSpy).toHaveBeenCalledWith({
			color: 'mock-changed-color',
			name: 'mock-tag-name',
			story_id: story.id,
			type: 'setStoryTagColor'
		});
	});
});
