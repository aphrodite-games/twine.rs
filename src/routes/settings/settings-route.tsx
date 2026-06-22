import * as React from 'react';
import {
	Badge,
	Button,
	Input,
	Panel,
	Select,
	Switch,
	TablerIcon
} from '../../components/design-system';
import type {TwineElectronWindow} from '../../electron/shared';
import {setPref, usePrefsContext} from '../../store/prefs';
import {closestAppLocale, locales} from '../../util/locales';
import './settings-route.css';

const themeOptions = [
	{label: 'System', value: 'system'},
	{label: 'Light', value: 'light'},
	{label: 'Dark', value: 'dark'}
];

const dialogWidthOptions = [
	{label: 'Default', value: '600'},
	{label: 'Wide', value: '700'},
	{label: 'Widest', value: '800'}
];

const tagDisplayOptions = [
	{label: 'Color bars', value: 'color'},
	{label: 'Tag names', value: 'name'}
];

const keybindingOptions = [
	{label: 'Default', value: 'default'},
	{label: 'Emacs-style', value: 'emacs'},
	{label: 'Vim-style', value: 'vim'}
];

export const SettingsRoute: React.FC = () => {
	const {dispatch, prefs} = usePrefsContext();
	const [storyLibraryFolder, setStoryLibraryFolder] = React.useState('');

	React.useEffect(() => {
		let cancelled = false;

		(window as TwineElectronWindow).twineElectron?.getStoryLibraryFolder?.()
			.then(path => {
				if (!cancelled) {
					setStoryLibraryFolder(path);
				}
			})
			.catch(() => undefined);

		return () => {
			cancelled = true;
		};
	}, []);

	function setUseCodeMirror(value: boolean) {
		dispatch(setPref('useCodeMirror', value));

		if (!value) {
			dispatch(setPref('editorCursorBlinks', true));
		}
	}

	async function chooseStoryLibraryFolder() {
		const path = await (window as TwineElectronWindow).twineElectron
			?.chooseStoryLibraryFolder?.();

		if (path) {
			setStoryLibraryFolder(path);
		}
	}

	function revealStoryLibraryFolder() {
		void (window as TwineElectronWindow).twineElectron?.revealStoryLibraryFolder?.();
	}

	return (
		<div className="settings-route">
			<header className="settings-route__head">
				<div className="settings-route__head-icon">
					<TablerIcon icon="settings" />
				</div>
				<div>
					<h1>Settings</h1>
					<div className="settings-route__subhead">
						<Badge icon="keyboard" tone="neutral">
							{prefs.keybindingPreset}
						</Badge>
						<Badge icon="palette" tone="neutral">
							{prefs.appTheme}
						</Badge>
						<Badge icon="code" tone={prefs.useCodeMirror ? 'saved' : 'neutral'}>
							Enhanced editors
						</Badge>
					</div>
				</div>
			</header>

			<div className="settings-route__grid">
				<Panel icon="eye" pad title="Accessibility">
					<div className="settings-route__stack">
						<Switch
							checked={prefs.reducedMotion}
							label="Reduce motion"
							onChange={value => dispatch(setPref('reducedMotion', value))}
						/>
						<Switch
							checked={prefs.highContrast}
							label="High contrast"
							onChange={value => dispatch(setPref('highContrast', value))}
						/>
						<div className="settings-route__field">
							<span>Theme</span>
							<Select
								ariaLabel="Theme"
								onChange={value => dispatch(setPref('appTheme', value))}
								options={themeOptions}
								value={prefs.appTheme}
							/>
						</div>
						<div className="settings-route__field">
							<span>Language</span>
							<Select
								ariaLabel="Language"
								onChange={value => dispatch(setPref('locale', value))}
								options={locales.map(locale => ({
									label: locale.name,
									value: locale.code
								}))}
								value={closestAppLocale(prefs.locale)}
							/>
						</div>
					</div>
				</Panel>

				<Panel icon="keyboard" pad title="Keyboard">
					<div className="settings-route__stack">
						<div className="settings-route__field">
							<span>Shortcut profile</span>
							<Select
								ariaLabel="Shortcut profile"
								onChange={value =>
									dispatch(
										setPref(
											'keybindingPreset',
											value as typeof prefs.keybindingPreset
										)
									)
								}
								options={keybindingOptions}
								value={prefs.keybindingPreset}
							/>
						</div>
					</div>
				</Panel>

				<Panel icon="code" pad title="Editors">
					<div className="settings-route__stack">
						<Switch
							checked={prefs.useCodeMirror}
							label="Enhanced editors"
							onChange={setUseCodeMirror}
						/>
						<Switch
							checked={prefs.editorCursorBlinks}
							disabled={!prefs.useCodeMirror}
							label="Blinking cursor"
							onChange={value =>
								dispatch(setPref('editorCursorBlinks', value))
							}
						/>
						<div className="settings-route__field">
							<span>Passage cards</span>
							<Select
								ariaLabel="Passage card tag display"
								onChange={value =>
									dispatch(
										setPref(
											'passageTagDisplay',
											value as typeof prefs.passageTagDisplay
										)
									)
								}
								options={tagDisplayOptions}
								value={prefs.passageTagDisplay}
							/>
						</div>
						<div className="settings-route__field">
							<span>Dialog width</span>
							<Select
								ariaLabel="Dialog width"
								onChange={value =>
									dispatch(setPref('dialogWidth', parseInt(value)))
								}
								options={dialogWidthOptions}
								value={prefs.dialogWidth.toString()}
							/>
						</div>
					</div>
				</Panel>

				<Panel icon="folder" pad title="Folders">
					<div className="settings-route__stack">
						<Input
							block
							icon="database"
							label="Story library"
							readOnly
							value={storyLibraryFolder || 'Native desktop default'}
						/>
						<div className="settings-route__button-row">
							<Button icon="folder-open" onClick={chooseStoryLibraryFolder}>
								Choose Library
							</Button>
							<Button icon="arrow-up-right" onClick={revealStoryLibraryFolder}>
								Reveal
							</Button>
						</div>
						<Input
							block
							icon="folder"
							label="Project override"
							onChange={event =>
								dispatch(setPref('defaultProjectFolder', event.target.value))
							}
							placeholder="Use app default"
							value={prefs.defaultProjectFolder}
						/>
						<Input
							block
							icon="photo"
							label="Asset folder"
							onChange={event =>
								dispatch(setPref('defaultAssetFolder', event.target.value))
							}
							placeholder="Use project assets/"
							value={prefs.defaultAssetFolder}
						/>
					</div>
				</Panel>

				<Panel icon="plug" pad title="Integrations">
					<div className="settings-route__stack">
						<div className="settings-route__integration">
							<TablerIcon icon="puzzle" />
							<div>
								<b>Story format extensions</b>
								<span>
									{prefs.disabledStoryFormatEditorExtensions.length} disabled
								</span>
							</div>
						</div>
						<div className="settings-route__integration">
							<TablerIcon icon="database" />
							<div>
								<b>Storage mode</b>
								<span>
									{prefs.defaultProjectFolder
										? 'Project folder preferred'
										: 'App library default'}
								</span>
							</div>
						</div>
					</div>
				</Panel>
			</div>
		</div>
	);
};
