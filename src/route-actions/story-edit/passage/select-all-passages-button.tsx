import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../components/design-system';
import {
	selectAllPassages,
	Story,
	useStoriesContext
} from '../../../store/stories';

export interface SelectAllPassagesButtonProps {
	story: Story;
}

export const SelectAllPassagesButton: React.FC<
	SelectAllPassagesButtonProps
> = props => {
	const {story} = props;
	const {dispatch} = useStoriesContext();
	const {t} = useTranslation();

	return (
		<IconButton
			icon="marquee"
			label={t('common.selectAll')}
			onClick={() => dispatch(selectAllPassages(story))}
		/>
	);
};
