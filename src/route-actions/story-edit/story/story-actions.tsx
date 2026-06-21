import * as React from 'react';
import {RenameStoryButton} from '../../../components/story/rename-story-button';
import {renameStoryCommand, useCoreProjectHost} from '../../../core';
import {Story, useStoriesContext} from '../../../store/stories';
import {DetailsButton} from './details-button';
import {FindReplaceButton} from './find-replace-button';
import {JavaScriptButton} from './javascript-button';
import {PassageTagsButton} from './passage-tags-button';
import {StylesheetButton} from './stylesheet-button';

export interface StoryActionsProps {
	story: Story;
}

export const StoryActions: React.FC<StoryActionsProps> = props => {
	const {stories} = useStoriesContext();
	const coreProjectHost = useCoreProjectHost();
	const {story} = props;

	return (
		<div className="route-action-group">
			<FindReplaceButton story={story} />
			<RenameStoryButton
				existingStories={stories}
				onRename={name =>
					coreProjectHost.applyStoryCommand(renameStoryCommand(story.id, name))
				}
				story={story}
			/>
			<DetailsButton story={story} />
			<PassageTagsButton story={story} />
			<JavaScriptButton story={story} />
			<StylesheetButton story={story} />
		</div>
	);
};
