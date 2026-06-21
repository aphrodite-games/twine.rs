import classNames from 'classnames';
import {
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight
} from '@tabler/icons';
import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../components/control/icon-button';
import {TagGrid} from '../../components/tag';
import {VisibleWhitespace} from '../../components/visible-whitespace';
import {storyToCoreIndex} from '../../core';
import {Passage, Story} from '../../store/stories';
import {parseLinks} from '../../util/parse-links';
import {StoryEditMode} from './workspace-state';
import {StoryTextPanel} from './story-text-panel';

export interface StoryWorkspaceShellProps {
	bottomDrawerOpen: boolean;
	graphPanel: React.ReactNode;
	leftDockCollapsed: boolean;
	mode: StoryEditMode;
	onChangeBottomDrawerOpen: (value: boolean) => void;
	onChangeLeftDockCollapsed: (value: boolean) => void;
	onChangeRightDockCollapsed: (value: boolean) => void;
	onSelectPassage: (passage: Passage) => void;
	rightDockCollapsed: boolean;
	selectedPassageId?: string;
	story: Story;
}

function selectedPassage(story: Story, selectedPassageId?: string) {
	return (
		story.passages.find(passage => passage.id === selectedPassageId) ??
		story.passages.find(passage => passage.id === story.startPassage) ??
		story.passages[0]
	);
}

function countWords(text: string) {
	const trimmed = text.trim();

	if (trimmed === '') {
		return 0;
	}

	return trimmed.split(/\s+/).length;
}

const DockHeader: React.FC<{
	children: React.ReactNode;
	collapsed: boolean;
	label: string;
	onChangeCollapsed: (value: boolean) => void;
	side: 'left' | 'right';
}> = props => {
	const {children, collapsed, label, onChangeCollapsed, side} = props;
	const {t} = useTranslation();
	const collapseIcon =
		side === 'left' ? <IconChevronLeft /> : <IconChevronRight />;
	const expandIcon =
		side === 'left' ? <IconChevronRight /> : <IconChevronLeft />;

	return (
		<header className="story-edit-dock-header">
			{!collapsed && <h2>{children}</h2>}
			<IconButton
				icon={collapsed ? expandIcon : collapseIcon}
				iconOnly
				label={t(
					collapsed
						? 'routes.storyEdit.workspace.expandDock'
						: 'routes.storyEdit.workspace.collapseDock',
					{dock: label}
				)}
				onClick={() => onChangeCollapsed(!collapsed)}
			/>
		</header>
	);
};

const PassageNavigator: React.FC<{
	onSelectPassage: (passage: Passage) => void;
	selectedPassageId?: string;
	story: Story;
}> = props => {
	const {onSelectPassage, selectedPassageId, story} = props;
	const {t} = useTranslation();

	return (
		<ol className="story-edit-passage-list">
			{story.passages.map(passage => (
				<li key={passage.id}>
					<button
						aria-current={passage.id === selectedPassageId ? 'true' : undefined}
						className={classNames('story-edit-passage-list-item', {
							selected: passage.id === selectedPassageId
						})}
						onClick={() => onSelectPassage(passage)}
						type="button"
					>
						<TagGrid tags={passage.tags} tagColors={story.tagColors} />
						<span className="story-edit-passage-list-name">
							<VisibleWhitespace value={passage.name} />
						</span>
						{story.startPassage === passage.id && (
							<span className="story-edit-passage-start">
								{t('routes.storyEdit.workspace.startPassage')}
							</span>
						)}
					</button>
				</li>
			))}
		</ol>
	);
};

const Inspector: React.FC<{
	onSelectPassage: (passage: Passage) => void;
	passage?: Passage;
	story: Story;
}> = props => {
	const {onSelectPassage, passage, story} = props;
	const {t} = useTranslation();
	const links = React.useMemo(
		() => (passage ? parseLinks(passage.text, true) : []),
		[passage]
	);
	const index = React.useMemo(() => storyToCoreIndex(story), [story]);

	return (
		<div className="story-edit-inspector">
			<section>
				<h3>{t('common.story')}</h3>
				<dl>
					<dt>{t('common.storyFormat')}</dt>
					<dd>
						{story.storyFormat} {story.storyFormatVersion}
					</dd>
					<dt>{t('routes.storyEdit.workspace.passages')}</dt>
					<dd>{story.passages.length}</dd>
					<dt>{t('routes.storyEdit.workspace.brokenLinks')}</dt>
					<dd>{index.graph.brokenLinks}</dd>
					<dt>{t('routes.storyEdit.workspace.orphanPassages')}</dt>
					<dd>{index.graph.orphanPassages}</dd>
					<dt>{t('routes.storyEdit.workspace.unreachablePassages')}</dt>
					<dd>{index.graph.unreachablePassages}</dd>
				</dl>
			</section>
			{passage && (
				<section>
					<h3>{t('common.passage')}</h3>
					<dl>
						<dt>{t('routes.storyEdit.workspace.words')}</dt>
						<dd>{countWords(passage.text)}</dd>
						<dt>{t('routes.storyEdit.workspace.links')}</dt>
						<dd>{links.length}</dd>
						<dt>{t('common.tags')}</dt>
						<dd>{passage.tags.length || t('colors.none')}</dd>
					</dl>
				</section>
			)}
			{index.diagnostics.length > 0 && (
				<section>
					<h3>{t('routes.storyEdit.workspace.diagnostics')}</h3>
					<ul className="story-edit-diagnostic-list">
						{index.diagnostics.slice(0, 8).map((diagnostic, ordinal) => {
							const diagnosticPassage = story.passages.find(
								passage => passage.id === diagnostic.passageId
							);

							return (
								<li
									key={`${diagnostic.sourceId}-${diagnostic.code}-${ordinal}`}
								>
									{diagnosticPassage ? (
										<button
											className={`story-edit-diagnostic ${diagnostic.severity}`}
											onClick={() => onSelectPassage(diagnosticPassage)}
											type="button"
										>
											<span>{diagnosticPassage.name}</span>
											{diagnostic.message}
										</button>
									) : (
										<span
											className={`story-edit-diagnostic ${diagnostic.severity}`}
										>
											{diagnostic.message}
										</span>
									)}
								</li>
							);
						})}
					</ul>
				</section>
			)}
		</div>
	);
};

const BottomDrawer: React.FC<{
	onChangeOpen: (value: boolean) => void;
	onSelectPassage: (passage: Passage) => void;
	open: boolean;
	passage?: Passage;
	story: Story;
}> = props => {
	const {onChangeOpen, onSelectPassage, open, passage, story} = props;
	const {t} = useTranslation();
	const links = React.useMemo(
		() => (passage ? parseLinks(passage.text, true) : []),
		[passage]
	);

	if (!open) {
		return null;
	}

	return (
		<section
			aria-label={t('routes.storyEdit.workspace.bottomDrawer')}
			className="story-edit-bottom-drawer"
		>
			<header>
				<h2>{t('routes.storyEdit.workspace.bottomDrawer')}</h2>
				<IconButton
					icon={<IconChevronDown />}
					iconOnly
					label={t('routes.storyEdit.workspace.closeBottomDrawer')}
					onClick={() => onChangeOpen(false)}
				/>
			</header>
			<div className="story-edit-bottom-drawer-content">
				{links.length > 0 ? (
					<ul>
						{links.map(link => {
							const linkedPassage = story.passages.find(
								passage => passage.name === link
							);

							return (
								<li key={link}>
									{linkedPassage ? (
										<button
											className="story-edit-link-chip"
											onClick={() => onSelectPassage(linkedPassage)}
											type="button"
										>
											{link}
										</button>
									) : (
										<span className="story-edit-link-chip missing">{link}</span>
									)}
								</li>
							);
						})}
					</ul>
				) : (
					<p>{t('routes.storyEdit.workspace.noLinks')}</p>
				)}
			</div>
		</section>
	);
};

export const StoryWorkspaceShell: React.FC<
	StoryWorkspaceShellProps
> = props => {
	const {
		bottomDrawerOpen,
		graphPanel,
		leftDockCollapsed,
		mode,
		onChangeBottomDrawerOpen,
		onChangeLeftDockCollapsed,
		onChangeRightDockCollapsed,
		onSelectPassage,
		rightDockCollapsed,
		selectedPassageId,
		story
	} = props;
	const passage = selectedPassage(story, selectedPassageId);
	const {t} = useTranslation();
	const showGraph = mode === 'graph' || mode === 'split';
	const showText = mode === 'text' || mode === 'split';

	return (
		<div
			className={classNames('story-edit-workspace', `mode-${mode}`, {
				'bottom-drawer-open': bottomDrawerOpen,
				'left-dock-collapsed': leftDockCollapsed,
				'right-dock-collapsed': rightDockCollapsed
			})}
		>
			<aside
				aria-label={t('routes.storyEdit.workspace.leftDock')}
				className="story-edit-dock story-edit-left-dock"
			>
				<DockHeader
					collapsed={leftDockCollapsed}
					label={t('routes.storyEdit.workspace.leftDock')}
					onChangeCollapsed={onChangeLeftDockCollapsed}
					side="left"
				>
					{t('routes.storyEdit.workspace.passages')}
				</DockHeader>
				{!leftDockCollapsed && (
					<PassageNavigator
						onSelectPassage={onSelectPassage}
						selectedPassageId={passage?.id}
						story={story}
					/>
				)}
			</aside>
			{showGraph && graphPanel}
			{showText && (
				<div className="story-edit-text-layer">
					<StoryTextPanel
						onSelectPassage={onSelectPassage}
						selectedPassageId={passage?.id}
						story={story}
					/>
				</div>
			)}
			<aside
				aria-label={t('routes.storyEdit.workspace.rightDock')}
				className="story-edit-dock story-edit-right-dock"
			>
				<DockHeader
					collapsed={rightDockCollapsed}
					label={t('routes.storyEdit.workspace.rightDock')}
					onChangeCollapsed={onChangeRightDockCollapsed}
					side="right"
				>
					{t('routes.storyEdit.workspace.inspector')}
				</DockHeader>
				{!rightDockCollapsed && (
					<Inspector
						onSelectPassage={onSelectPassage}
						passage={passage}
						story={story}
					/>
				)}
			</aside>
			<BottomDrawer
				onChangeOpen={onChangeBottomDrawerOpen}
				onSelectPassage={onSelectPassage}
				open={bottomDrawerOpen}
				passage={passage}
				story={story}
			/>
		</div>
	);
};
