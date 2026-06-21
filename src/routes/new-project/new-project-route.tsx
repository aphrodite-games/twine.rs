import {v4 as uuid} from '@lukeed/uuid';
import classNames from 'classnames';
import * as React from 'react';
import {useHistory, useLocation} from 'react-router-dom';
import {
	Badge,
	Button,
	Checkbox,
	Input,
	Panel,
	SegmentedControl,
	Select,
	TablerIcon
} from '../../components/design-system';
import {storyFileName} from '../../electron/shared';
import {usePrefsContext} from '../../store/prefs';
import {
	createStory,
	importStories as importStoriesAction,
	passageDefaults,
	Story,
	useStoriesContext
} from '../../store/stories';
import {useStoryFormatsContext} from '../../store/story-formats';
import {useStoriesRepair} from '../../store/use-stories-repair';
import {importStories as importStoriesFromHtml} from '../../util/import';
import {storyFromTwee} from '../../util/twee';
import {StoryEditMode} from '../story-edit/workspace-state';
import './new-project-route.css';

type NewProjectTab = 'create' | 'import';
type SourceLayout = 'single' | 'multi';

interface ImportQueue {
	fileName: string;
	stories: Story[];
	selectedIds: string[];
}

function formatKey(name: string, version: string) {
	return `${name}@${version}`;
}

function parseFormatKey(key: string) {
	const [name, ...versionParts] = key.split('@');

	return {
		name,
		version: versionParts.join('@')
	};
}

function workspaceStorageKey(storyId: string) {
	return `twine-story-edit-workspace-${storyId}`;
}

async function readFile(file: File) {
	if ('text' in file) {
		return file.text();
	}

	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();

		reader.onerror = () => reject(reader.error);
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.readAsText(file);
	});
}

function parseStoryFile(file: File, source: string) {
	if (/\.html?$/i.test(file.name)) {
		return importStoriesFromHtml(source);
	}

	return [storyFromTwee(source)];
}

export const NewProjectRoute: React.FC = () => {
	const history = useHistory();
	const location = useLocation();
	const repairStories = useStoriesRepair();
	const {prefs} = usePrefsContext();
	const {formats} = useStoryFormatsContext();
	const {dispatch, stories} = useStoriesContext();
	const pathname = location.pathname ?? '';
	const [tab, setTab] = React.useState<NewProjectTab>(
		pathname.endsWith('/import') ? 'import' : 'create'
	);
	const [projectName, setProjectName] = React.useState('Untitled Story');
	const [startPassageName, setStartPassageName] = React.useState('Start');
	const [format, setFormat] = React.useState(
		formatKey(prefs.storyFormat.name, prefs.storyFormat.version)
	);
	const [sourceLayout, setSourceLayout] =
		React.useState<SourceLayout>('single');
	const [initialMode, setInitialMode] = React.useState<StoryEditMode>('graph');
	const [graphLayout, setGraphLayout] = React.useState(true);
	const [error, setError] = React.useState<string>();
	const [importQueue, setImportQueue] = React.useState<ImportQueue>();
	const [importing, setImporting] = React.useState(false);
	const [importError, setImportError] = React.useState<string>();
	const fileInput = React.useRef<HTMLInputElement>(null);
	const formatOptions = React.useMemo(
		() =>
			formats.map(format => ({
				label: `${format.name} ${format.version}`,
				value: formatKey(format.name, format.version)
			})),
		[formats]
	);

	React.useEffect(() => {
		const nextTab = pathname.endsWith('/import') ? 'import' : 'create';

		setTab(nextTab);
	}, [pathname]);

	function handleChangeTab(value: string) {
		const nextTab = value as NewProjectTab;

		setTab(nextTab);
		history.replace(nextTab === 'import' ? '/new-project/import' : '/new-project');
	}

	function handleCreate(event: React.FormEvent) {
		event.preventDefault();
		setError(undefined);

		const storyName = projectName.trim();
		const storyId = uuid();
		const passageName = startPassageName.trim() || 'Start';
		const passageId = uuid();
		const selectedFormat = parseFormatKey(format);
		const defaults = passageDefaults();

		try {
			dispatch(
				createStory(stories, prefs, {
					id: storyId,
					name: storyName,
					passages: [
						{
							...defaults,
							height: graphLayout ? 140 : defaults.height,
							id: passageId,
							left: graphLayout ? 96 : defaults.left,
							name: passageName,
							selected: true,
							story: '',
							text:
								sourceLayout === 'multi'
									? `[[${passageName} Notes]]`
									: defaults.text,
							top: graphLayout ? 88 : defaults.top,
							width: graphLayout ? 180 : defaults.width
						}
					],
					selected: true,
					startPassage: passageId,
					storyFormat: selectedFormat.name,
					storyFormatVersion: selectedFormat.version
				})
			);

			window.localStorage.setItem(
				workspaceStorageKey(storyId),
				JSON.stringify({mode: initialMode, selectedPassageId: passageId})
			);
			history.push(`/stories/${storyId}`);
		} catch (error) {
			setError((error as Error).message);
		}
	}

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];

		if (!file) {
			return;
		}

		setImportError(undefined);
		setImportQueue(undefined);
		setImporting(true);

		try {
			const importedStories = parseStoryFile(file, await readFile(file));

			setImportQueue({
				fileName: file.name,
				selectedIds: importedStories
					.filter(story => !willReplaceExisting(story))
					.map(story => story.id),
				stories: importedStories
			});
		} catch (error) {
			setImportError((error as Error).message);
		} finally {
			setImporting(false);
			event.target.value = '';
		}
	}

	function willReplaceExisting(story: Story) {
		return stories.some(existing => storyFileName(existing) === storyFileName(story));
	}

	function setImportSelected(story: Story, selected: boolean) {
		setImportQueue(current => {
			if (!current) {
				return current;
			}

			return {
				...current,
				selectedIds: selected
					? Array.from(new Set([...current.selectedIds, story.id]))
					: current.selectedIds.filter(id => id !== story.id)
			};
		});
	}

	function handleImport() {
		if (!importQueue) {
			return;
		}

		const selectedStories = importQueue.stories.filter(story =>
			importQueue.selectedIds.includes(story.id)
		);

		if (selectedStories.length === 0) {
			return;
		}

		dispatch(importStoriesAction(selectedStories, stories));
		repairStories();
		history.push('/');
	}

	return (
		<div className="new-project-route">
			<header className="new-project-route__head">
				<div>
					<h1>New Project</h1>
					<p>{tab === 'create' ? 'Create' : 'Import'}</p>
				</div>
				<div className="new-project-route__tabs">
					<SegmentedControl
						onChange={handleChangeTab}
						options={[
							{icon: 'plus', label: 'Create', value: 'create'},
							{icon: 'file-import', label: 'Import', value: 'import'}
						]}
						value={tab}
					/>
				</div>
			</header>
			<div
				className={classNames(
					'new-project-route__grid',
					tab === 'import' && 'new-project-route__grid--import'
				)}
			>
				{tab === 'create' ? (
					<form className="new-project-route__form" onSubmit={handleCreate}>
						<Panel icon="folder-plus" title="Project" pad>
							<div className="new-project-route__fields">
								<Input
									autoFocus
									block
									icon="writing"
									label="Project name"
									onChange={event => setProjectName(event.target.value)}
									value={projectName}
								/>
								<Input
									block
									icon="rocket"
									label="Start passage"
									onChange={event => setStartPassageName(event.target.value)}
									value={startPassageName}
								/>
								<label className="new-project-route__field-label">
									<span>Story format</span>
									<Select
										block
										onChange={setFormat}
										options={formatOptions}
										value={format}
									/>
								</label>
							</div>
						</Panel>
						<Panel icon="layout-columns" title="Workspace" pad>
							<div className="new-project-route__fields">
								<label className="new-project-route__field-label">
									<span>Source layout</span>
									<SegmentedControl
										onChange={value => setSourceLayout(value as SourceLayout)}
										options={[
											{icon: 'file-text', label: 'Single', value: 'single'},
											{icon: 'files', label: 'Multi', value: 'multi'}
										]}
										value={sourceLayout}
									/>
								</label>
								<label className="new-project-route__field-label">
									<span>Initial mode</span>
									<SegmentedControl
										onChange={value => setInitialMode(value as StoryEditMode)}
										options={[
											{icon: 'file-text', label: 'Text', value: 'text'},
											{icon: 'binary-tree', label: 'Graph', value: 'graph'},
											{icon: 'layout-columns', label: 'Split', value: 'split'}
										]}
										value={initialMode}
									/>
								</label>
								<Checkbox
									checked={graphLayout}
									label="Create graph layout"
									onChange={setGraphLayout}
								/>
							</div>
						</Panel>
						{error && (
							<Badge icon="alert-octagon" tone="error">
								{error}
							</Badge>
						)}
						<div className="new-project-route__actions">
							<Button icon="arrow-back-up" onClick={() => history.push('/')}>
								Cancel
							</Button>
							<Button icon="plus" type="submit" variant="primary">
								Create Project
							</Button>
						</div>
					</form>
				) : (
					<div className="new-project-route__import">
						<Panel icon="file-import" title="Import Source" pad>
							<div className="new-project-route__dropzone">
								<input
									accept=".html,.htm,.twee,.tw"
									aria-label="Source file"
									onChange={handleFileChange}
									ref={fileInput}
									type="file"
								/>
								<TablerIcon icon="file-import" />
								<Button
									icon="folder-open"
									loading={importing}
									onClick={() => fileInput.current?.click()}
									variant="primary"
								>
									Choose File
								</Button>
								<span>.html, .twee, .tw</span>
							</div>
							{importError && (
								<Badge icon="alert-octagon" tone="error">
									{importError}
								</Badge>
							)}
						</Panel>
						<Panel
							count={importQueue?.stories.length ?? 0}
							icon="list-details"
							title="Review"
						>
							{!importQueue ? (
								<div className="new-project-route__review-empty">
									<TablerIcon icon="file-import" />
								</div>
							) : importQueue.stories.length === 0 ? (
								<div className="new-project-route__review-empty">
									<TablerIcon icon="photo-off" />
									<p>No stories found in {importQueue.fileName}</p>
								</div>
							) : (
								<div className="new-project-route__review">
									<table>
										<thead>
											<tr>
												<th aria-label="Selected" />
												<th>Project</th>
												<th>Format</th>
												<th>Passages</th>
												<th>Status</th>
											</tr>
										</thead>
										<tbody>
											{importQueue.stories.map(story => (
												<tr key={story.id}>
													<td>
														<Checkbox
															checked={importQueue.selectedIds.includes(story.id)}
															onChange={selected =>
																setImportSelected(story, selected)
															}
														/>
													</td>
													<td>
														<div className="new-project-route__project-name">
															{story.name}
														</div>
														<div className="new-project-route__project-meta">
															{storyFileName(story)}
														</div>
													</td>
													<td>
														{story.storyFormat} {story.storyFormatVersion}
													</td>
													<td>{story.passages.length}</td>
													<td>
														{willReplaceExisting(story) ? (
															<Badge icon="refresh" tone="warn">
																Replace
															</Badge>
														) : (
															<Badge icon="plus" tone="saved">
																New
															</Badge>
														)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</Panel>
						<div className="new-project-route__actions">
							<Button icon="arrow-back-up" onClick={() => history.push('/')}>
								Cancel
							</Button>
							<Button
								disabled={
									!importQueue ||
									importQueue.stories.length === 0 ||
									importQueue.selectedIds.length === 0
								}
								icon="file-import"
								onClick={handleImport}
								variant="primary"
							>
								Run Import
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
