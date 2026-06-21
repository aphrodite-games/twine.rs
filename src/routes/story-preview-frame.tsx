import * as React from 'react';
import {ErrorMessage} from '../components/error';
import './story-preview-frame.css';

export interface StoryPreviewFrameProps {
	error?: Error;
	html?: string;
	missingStoryMessage: string;
	storyExists: boolean;
	title: string;
}

export const StoryPreviewFrame: React.FC<StoryPreviewFrameProps> = props => {
	const {error, html, missingStoryMessage, storyExists, title} = props;

	if (error) {
		return <ErrorMessage>{error.message}</ErrorMessage>;
	}

	if (!storyExists) {
		return <ErrorMessage>{missingStoryMessage}</ErrorMessage>;
	}

	return (
		<main className="story-preview-route">
			{html ? (
				<iframe
					className="story-preview-route__frame"
					srcDoc={html}
					title={title}
				/>
			) : (
				<div className="story-preview-route__loading" role="status">
					Loading story...
				</div>
			)}
		</main>
	);
};
