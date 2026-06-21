import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../components/design-system';
import {updateStory, useStoriesContext, Story} from '../../../store/stories';
import './zoom-buttons.css';

export interface ZoomButtonsProps {
	story: Story;
}

export const ZoomButtons: React.FC<ZoomButtonsProps> = React.memo(({story}) => {
	const {dispatch, stories} = useStoriesContext();
	const {t} = useTranslation();

	const handleZoomChange = React.useCallback(
		(zoom: number) => {
			dispatch(updateStory(stories, story, {zoom}));
		},
		[dispatch, stories, story]
	);

	return (
		<div className="zoom-buttons">
			<span className="legend">{t('routes.storyEdit.zoomButtons.legend')}</span>
			<IconButton
				active={story.zoom === 1}
				aria-pressed={story.zoom === 1}
				icon="square"
				label={t('routes.storyEdit.zoomButtons.passageNamesAndExcerpts')}
				onClick={() => handleZoomChange(1)}
			/>
			<IconButton
				active={story.zoom === 0.6}
				aria-pressed={story.zoom === 0.6}
				icon="layout-grid"
				label={t('routes.storyEdit.zoomButtons.passageNames')}
				onClick={() => handleZoomChange(0.6)}
			/>
			<IconButton
				active={story.zoom === 0.3}
				aria-pressed={story.zoom === 0.3}
				icon="grid-dots"
				label={t('routes.storyEdit.zoomButtons.storyStructure')}
				onClick={() => handleZoomChange(0.3)}
			/>
		</div>
	);
});

ZoomButtons.displayName = 'ZoomButtons';
