import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {axe} from 'jest-axe';
import * as React from 'react';
import {Router} from 'react-router-dom';
import {
	FakeStateProvider,
	fakeLoadedStoryFormat,
	fakeStory,
	StoryInspector
} from '../../../test-util';
import {NewProjectRoute} from '../new-project-route';

describe('<NewProjectRoute>', () => {
	function renderComponent(path = '/new-project') {
		const format = fakeLoadedStoryFormat(
			{name: 'Harlowe', version: '3.3.9'},
			{name: 'Harlowe', version: '3.3.9'}
		);
		const history = createMemoryHistory({initialEntries: [path]});
		const result = render(
			<Router history={history}>
				<FakeStateProvider
					prefs={{storyFormat: {name: 'Harlowe', version: '3.3.9'}}}
					stories={[]}
					storyFormats={[format]}
				>
					<NewProjectRoute />
					<StoryInspector />
				</FakeStateProvider>
			</Router>
		);

		return {...result, history};
	}

	afterEach(() => {
		delete (window as any).twineElectron;
	});

	it('creates a native project folder and a story with a named start passage', async () => {
		(window as any).twineElectron = {
			createProjectFolder: jest.fn(async story => ({
				rootPath: `/native/${story.name}.twine.rs`,
				stories: [story],
				storyIds: [story.id]
			})),
			getStoryLibraryFolder: jest.fn(async () => '/native/library')
		};
		const {container, history} = renderComponent();

		fireEvent.change(screen.getByLabelText('Project name'), {
			target: {value: 'Moon Castle'}
		});
		fireEvent.change(screen.getByLabelText('Start passage'), {
			target: {value: 'Opening'}
		});
		fireEvent.click(screen.getByRole('button', {name: /create project/i}));

		await waitFor(() =>
			expect(screen.getByTestId('story-inspector-default')).toHaveAttribute(
				'data-name',
				'Moon Castle'
			)
		);
		expect((window as any).twineElectron.createProjectFolder).toHaveBeenCalled();
		expect(history.location.pathname).toMatch(/^\/stories\//);
		expect(container.querySelector('[data-name="Opening"]')).toBeInTheDocument();
	});

	it('renders the import workspace for /new-project/import', () => {
		renderComponent('/new-project/import');

		expect(screen.getByRole('button', {name: /choose file/i})).toBeInTheDocument();
		expect(
			screen.getByRole('button', {name: /open project folder/i})
		).toBeInTheDocument();
		expect(screen.getByLabelText('Source file')).toHaveAttribute(
			'accept',
			'.html,.htm,.twee,.tw'
		);
	});

	it('opens native project folders from the import workspace', async () => {
		const story = {
			...fakeStory(1),
			id: 'native-story',
			name: 'Native Story',
			storyFormat: 'Harlowe',
			storyFormatVersion: '3.3.9'
		};

		(window as any).twineElectron = {
			openProjectFolder: jest.fn(async () => ({
				rootPath: '/native/Native Story.twine.rs',
				stories: [story],
				storyIds: [story.id]
			}))
		};

		const {history} = renderComponent('/new-project/import');

		fireEvent.click(screen.getByRole('button', {name: /open project folder/i}));

		await waitFor(() =>
			expect(screen.getByTestId('story-inspector-default')).toHaveAttribute(
				'data-name',
				'Native Story'
			)
		);
		expect(history.location.pathname).toBe('/');
	});

	it('is accessible', async () => {
		const {container} = renderComponent();

		expect(await axe(container)).toHaveNoViolations();
	});
});
