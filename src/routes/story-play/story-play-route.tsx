import * as React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {usePublishing} from '../../store/use-publishing';
import {useStoriesContext} from '../../store/stories';
import {StoryPreviewFrame} from '../story-preview-frame';

export const StoryPlayRoute: React.FC = () => {
	const [publishError, setPublishError] = React.useState<Error>();
	const [html, setHtml] = React.useState<string>();
	const {storyId} = useParams<{storyId: string}>();
	const history = useHistory();
	const {publishStory} = usePublishing();
	const publishStoryRef = React.useRef(publishStory);
	const {stories} = useStoriesContext();
	const story = stories.find(story => story.id === storyId);
	const storyExists = !!story;
	const startPassage = story?.passages.find(
		passage => passage.id === story.startPassage
	);

	React.useEffect(() => {
		publishStoryRef.current = publishStory;
	}, [publishStory]);

	React.useEffect(() => {
		let active = true;

		async function load() {
			try {
				const published = await publishStoryRef.current(storyId, {
					buildTarget: 'play'
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
	}, [storyExists, storyId]);

	return (
		<StoryPreviewFrame
			error={publishError}
			html={html}
			missingStoryMessage={`There is no story with ID "${storyId}".`}
			onRevealGraph={() =>
				history.push(
					`/stories/${storyId}?mode=graph${
						startPassage ? `&passage=${startPassage.id}` : ''
					}`
				)
			}
			onRevealSource={() =>
				history.push(
					`/stories/${storyId}?mode=text${
						startPassage ? `&passage=${startPassage.id}` : ''
					}`
				)
			}
			startPassageName={startPassage?.name}
			storyExists={storyExists}
			storyName={story?.name}
			targetLabel="Play"
			title="Story preview"
		/>
	);
};
