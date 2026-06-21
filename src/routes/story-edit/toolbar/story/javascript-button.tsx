import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {IconButton} from '../../../../components/design-system';
import {StoryJavaScriptDialog, useDialogsContext} from '../../../../dialogs';
import {Story} from '../../../../store/stories';

export interface JavaScriptButtonProps {
	story: Story;
}

export const JavaScriptButton: React.FC<JavaScriptButtonProps> = props => {
	const {story} = props;
	const {dispatch} = useDialogsContext();
	const {t} = useTranslation();

	return (
		<IconButton
			icon="braces"
			label={t('routes.storyEdit.toolbar.javaScript')}
			onClick={() =>
				dispatch({
					type: 'addDialog',
					component: StoryJavaScriptDialog,
					props: {storyId: story.id}
				})
			}
		/>
	);
};
