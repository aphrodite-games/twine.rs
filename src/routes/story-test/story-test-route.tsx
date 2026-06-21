import * as React from 'react';
import {useParams} from 'react-router-dom';
import {usePublishing} from '../../store/use-publishing';
import {useStoriesContext} from '../../store/stories';
import {StoryPreviewFrame} from '../story-preview-frame';

export const StoryTestRoute: React.FC = () => {
	const [publishError, setPublishError] = React.useState<Error>();
	const [html, setHtml] = React.useState<string>();
	const {passageId, storyId} = useParams<{
		passageId: string;
		storyId: string;
	}>();
	const {publishStory} = usePublishing();
	const {stories} = useStoriesContext();
	const storyExists = stories.some(story => story.id === storyId);

	React.useEffect(() => {
		let active = true;

		async function load() {
			try {
				const published = await publishStory(storyId, {
					buildTarget: 'test',
					formatOptions: 'debug',
					startId: passageId
				});

				if (active) {
					setHtml(published);
				}
			} catch (error) {
				if (active) {
					setPublishError(error as Error);
				}
			}
		}

		setHtml(undefined);
		setPublishError(undefined);

		if (storyExists) {
			load();
		}

		return () => {
			active = false;
		};
	}, [passageId, publishStory, storyExists, storyId]);

	return (
		<StoryPreviewFrame
			error={publishError}
			html={html}
			missingStoryMessage={`There is no story with ID "${storyId}".`}
			storyExists={storyExists}
			title="Story test preview"
		/>
	);
};
