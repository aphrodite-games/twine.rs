import {fireEvent, render, screen} from '@testing-library/react';
import * as React from 'react';
import {FakeStateProvider} from '../../../test-util';
import {SettingsRoute} from '../settings-route';

describe('<SettingsRoute>', () => {
	it('renders DS settings sections backed by preferences', () => {
		render(
			<FakeStateProvider
				prefs={{
					appTheme: 'dark',
					defaultAssetFolder: '/tmp/assets',
					defaultProjectFolder: '/tmp/projects',
					keybindingPreset: 'vim',
					useCodeMirror: true
				}}
			>
				<SettingsRoute />
			</FakeStateProvider>
		);

		expect(screen.getByRole('heading', {name: 'Settings'})).toBeInTheDocument();
		expect(screen.getByText('Accessibility')).toBeInTheDocument();
		expect(screen.getByText('Keyboard')).toBeInTheDocument();
		expect(screen.getByText('Editors')).toBeInTheDocument();
		expect(screen.getByText('Folders')).toBeInTheDocument();
		expect(screen.getByText('Integrations')).toBeInTheDocument();
		expect(screen.getByDisplayValue('/tmp/projects')).toBeInTheDocument();
		expect(screen.getByText('vim')).toBeInTheDocument();
	});

	it('updates preferences from settings controls', () => {
		render(
			<FakeStateProvider prefs={{defaultProjectFolder: ''}}>
				<SettingsRoute />
			</FakeStateProvider>
		);

		fireEvent.change(screen.getByLabelText('Project override'), {
			target: {value: '/Users/test/Stories'}
		});

		expect(screen.getByDisplayValue('/Users/test/Stories')).toBeInTheDocument();
	});
});
