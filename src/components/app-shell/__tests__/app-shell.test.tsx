import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import * as React from 'react';
import {MemoryRouter} from 'react-router-dom';
import {StoriesContext, Story} from '../../../store/stories';
import {fakeStory} from '../../../test-util/fakes';
import {AppShell} from '../app-shell';
import {useAppShellContext} from '../app-shell-context';

const mockPlayStory = jest.fn();
const mockProofStory = jest.fn();
const mockTestStory = jest.fn();

jest.mock('../../../store/use-publishing', () => ({
	usePublishing: () => ({
		publishStory: jest.fn(async () => '<html></html>')
	})
}));

jest.mock('../../../store/use-story-launch', () => ({
	useStoryLaunch: () => ({
		playStory: mockPlayStory,
		proofStory: mockProofStory,
		testStory: mockTestStory
	})
}));

const MockRouteActions: React.FC = () => {
	const appShell = useAppShellContext();

	React.useEffect(() => {
		appShell.setToolbar({
			pinnedControls: <span>Pin Control</span>,
			tabs: {
				Build: <button type="button">Build Action</button>,
				Story: <button type="button">Story Action</button>
			}
		});

		return () => appShell.setToolbar(undefined);
	}, [appShell]);

	return null;
};

function renderShell(story: Story, route = `/stories/${story.id}`) {
	return render(
		<StoriesContext.Provider value={{dispatch: jest.fn(), stories: [story]}}>
			<MemoryRouter initialEntries={[route]}>
				<AppShell>
					<MockRouteActions />
				</AppShell>
			</MemoryRouter>
		</StoriesContext.Provider>
	);
}

describe('AppShell', () => {
	let story: Story;

	beforeEach(() => {
		jest.clearAllMocks();
		story = {
			...fakeStory(2),
			id: 'mock-story',
			name: 'Moon Castle',
			passages: fakeStory(2).passages.map((passage, index) => ({
				...passage,
				name: index === 0 ? 'Opening' : 'Atrium',
				selected: index === 0,
				text: index === 0 ? 'one two three' : 'four five'
			}))
		};
	});

	it('wraps route content with shell anatomy and command-bar slots', async () => {
		const {container} = renderShell(story);

		expect(screen.getByTestId('app-shell')).toBeInTheDocument();
		expect(screen.getByLabelText('Twine')).toBeInTheDocument();
		expect(screen.getByText('Moon Castle')).toBeInTheDocument();
		expect(screen.getByTitle('Workbench')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(container.querySelector('.route-toolbar')).toBeNull();
		expect(await screen.findByText('Build Action')).toBeInTheDocument();
		expect(screen.getByText('Pin Control')).toBeInTheDocument();
		expect(screen.getByText('Opening')).toBeInTheDocument();
		expect(screen.getByText('5 words')).toBeInTheDocument();
	});

	it('opens the global command palette and runs shell commands', async () => {
		renderShell(story);

		fireEvent.keyDown(window, {key: 'k', metaKey: true});

		const input = await screen.findByLabelText('Command');

		fireEvent.change(input, {target: {value: 'play'}});
		fireEvent.keyDown(input, {key: 'Enter'});

		await waitFor(() => expect(mockPlayStory).toHaveBeenCalledWith(story.id));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});
