import {storyToCoreIndex} from '../story-index';
import {fakePassage, fakeStory} from '../../test-util';

describe('storyToCoreIndex', () => {
	it('indexes source files, tags, graph stats, and diagnostics', () => {
		const story = fakeStory(0);
		const start = fakePassage({
			id: 'start',
			name: 'Start',
			story: story.id,
			tags: ['scene'],
			text: 'Hello [[Next]] and [[Missing]]'
		});
		const next = fakePassage({
			id: 'next',
			name: 'Next',
			story: story.id,
			text: 'End'
		});
		const loose = fakePassage({
			id: 'loose',
			name: 'Loose',
			story: story.id,
			text: ''
		});

		story.startPassage = start.id;
		story.passages = [start, next, loose];
		story.script = 'const indexedScript = true;';
		story.stylesheet = 'tw-story { color: red; }';

		const index = storyToCoreIndex(story, 'indexed');

		expect(index.storyId).toBe(story.id);
		expect(index.files).toHaveLength(5);
		expect(index.tags).toEqual(['scene']);
		expect(index.graph).toMatchObject({
			brokenLinks: 1,
			emptyPassages: 1,
			links: 2,
			orphanPassages: 1,
			passages: 3,
			resolvedLinks: 1,
			unreachablePassages: 1
		});
		expect(index.diagnostics.map(diagnostic => diagnostic.code)).toEqual(
			expect.arrayContaining(['broken-link', 'unreachable-passage'])
		);
		expect(index.searchHits).toEqual([
			expect.objectContaining({
				scope: 'script',
				sourceName: 'Story JavaScript'
			})
		]);
	});
});
