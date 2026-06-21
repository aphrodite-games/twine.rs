import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../components/design-system';
import {setStartPassageCommand, useCoreProjectHost} from '../../../core';
import {Passage, Story} from '../../../store/stories';

export interface StartAtPassageButtonProps {
	passage?: Passage;
	story: Story;
}

export const StartAtPassageButton: React.FC<
	StartAtPassageButtonProps
> = props => {
	const {passage, story} = props;
	const coreProjectHost = useCoreProjectHost();
	const {t} = useTranslation();

	function handleClick() {
		if (!passage) {
			throw new Error('No passage set');
		}

		coreProjectHost.applyStoryCommand(
			setStartPassageCommand(story.id, passage.id)
		);
	}

	return (
		<IconButton
			disabled={!passage || passage.id === story.startPassage}
			icon="rocket"
			label={t('routes.storyEdit.toolbar.startStoryHere')}
			onClick={handleClick}
		/>
	);
};
