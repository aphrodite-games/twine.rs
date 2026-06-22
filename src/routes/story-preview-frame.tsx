import * as React from 'react';
import {ErrorMessage} from '../components/error';
import {Button, Badge} from '../components/design-system';
import './story-preview-frame.css';

export interface StoryPreviewFrameProps {
	error?: Error;
	html?: string;
	missingStoryMessage: string;
	onRevealGraph?: () => void;
	onRevealSource?: () => void;
	startPassageName?: string;
	storyExists: boolean;
	storyName?: string;
	targetLabel?: string;
	title: string;
}

function byteLength(source: string) {
	return new Blob([source]).size;
}

export const StoryPreviewFrame: React.FC<StoryPreviewFrameProps> = props => {
	const {
		error,
		html,
		missingStoryMessage,
		onRevealGraph,
		onRevealSource,
		startPassageName,
		storyExists,
		storyName,
		targetLabel,
		title
	} = props;
	const storyDataCount = html?.match(/<tw-storydata\b/g)?.length ?? 0;

	if (error) {
		return <ErrorMessage>{error.message}</ErrorMessage>;
	}

	if (!storyExists) {
		return <ErrorMessage>{missingStoryMessage}</ErrorMessage>;
	}

	return (
		<main className="story-preview-route">
			<div className="story-preview-route__debug">
				<div className="story-preview-route__debug-main">
					<Badge icon="player-play" tone="build">
						{targetLabel ?? 'Preview'}
					</Badge>
					<span>{storyName ?? title}</span>
					{startPassageName && <span>Start: {startPassageName}</span>}
					{html && (
						<span>
							{byteLength(html)} bytes · {storyDataCount} story data
						</span>
					)}
				</div>
				<div className="story-preview-route__debug-actions">
					<Button
						disabled={!onRevealSource}
						icon="file-text"
						onClick={onRevealSource}
						size="sm"
					>
						Source
					</Button>
					<Button
						disabled={!onRevealGraph}
						icon="binary-tree"
						onClick={onRevealGraph}
						size="sm"
					>
						Graph
					</Button>
				</div>
			</div>
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
