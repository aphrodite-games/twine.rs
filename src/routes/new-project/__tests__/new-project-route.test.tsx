import {fireEvent, render, screen} from '@testing-library/react';
import {createMemoryHistory} from 'history';
import {axe} from 'jest-axe';
import * as React from 'react';
import {Router} from 'react-router-dom';
import {
	FakeStateProvider,
	fakeLoadedStoryFormat,
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

	it('creates a story with a named start passage', () => {
		const {container, history} = renderComponent();

		fireEvent.change(screen.getByLabelText('Project name'), {
			target: {value: 'Moon Castle'}
		});
		fireEvent.change(screen.getByLabelText('Start passage'), {
			target: {value: 'Opening'}
		});
		fireEvent.click(screen.getByRole('button', {name: /create project/i}));

		expect(screen.getByTestId('story-inspector-default')).toHaveAttribute(
			'data-name',
			'Moon Castle'
		);
		expect(history.location.pathname).toMatch(/^\/stories\//);
		expect(container.querySelector('[data-name="Opening"]')).toBeInTheDocument();
	});

	it('renders the import workspace for /new-project/import', () => {
		renderComponent('/new-project/import');

		expect(screen.getByRole('button', {name: /choose file/i})).toBeInTheDocument();
		expect(screen.getByLabelText('Source file')).toHaveAttribute(
			'accept',
			'.html,.htm,.twee,.tw'
		);
	});

	it('is accessible', async () => {
		const {container} = renderComponent();

		expect(await axe(container)).toHaveNoViolations();
	});
});
