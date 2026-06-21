import type {CoreDiagnostic} from './bindings/CoreDiagnostic';
import type {CoreGraphStats} from './bindings/CoreGraphStats';
import type {CoreSearchHit} from './bindings/CoreSearchHit';
import type {CoreSearchScope} from './bindings/CoreSearchScope';
import type {CoreSourceFile} from './bindings/CoreSourceFile';
import type {CoreStoryIndex} from './bindings/CoreStoryIndex';
import {Passage, Story} from '../store/stories';
import {parseLinks} from '../util/parse-links';

function lineCount(text: string) {
	return Math.max(text.split(/\r?\n/).length, 1);
}

function excerptAround(source: string, start: number, length: number) {
	const lineStart = source.lastIndexOf('\n', start - 1) + 1;
	const lineEnd = source.indexOf('\n', start);
	const end = lineEnd === -1 ? source.length : lineEnd;
	const excerpt = source.slice(lineStart, end).trim();

	if (excerpt.length <= 140) {
		return excerpt;
	}

	const windowStart = Math.max(start - 48, lineStart);
	const windowEnd = Math.min(start + length + 48, end);

	return `${windowStart > lineStart ? '...' : ''}${source
		.slice(windowStart, windowEnd)
		.trim()}${windowEnd < end ? '...' : ''}`;
}

function searchHitsInSource(
	query: string,
	sourceId: string,
	sourceName: string,
	source: string,
	scope: CoreSearchScope
): CoreSearchHit[] {
	const needle = query.trim().toLocaleLowerCase();

	if (needle === '') {
		return [];
	}

	const haystack = source.toLocaleLowerCase();
	const result: CoreSearchHit[] = [];
	let cursor = 0;
	let start = haystack.indexOf(needle, cursor);

	while (start !== -1) {
		result.push({
			excerpt: excerptAround(source, start, query.length),
			line: source.slice(0, start).split(/\r?\n/).length,
			scope,
			sourceId,
			sourceName,
			start
		});
		cursor = start + Math.max(needle.length, 1);
		start = haystack.indexOf(needle, cursor);
	}

	return result;
}

function sourceFileForPassage(passage: Passage): CoreSourceFile {
	return {
		characterCount: passage.text.length,
		id: passage.id,
		kind: 'passage',
		lineCount: lineCount(passage.text),
		name: passage.name,
		passageId: passage.id,
		tags: passage.tags
	};
}

function graphStats(story: Story): CoreGraphStats {
	const passageByName = new Map(
		story.passages.map(passage => [passage.name, passage])
	);
	const incoming = new Map(story.passages.map(passage => [passage.id, 0]));
	let brokenLinks = 0;
	let links = 0;
	let resolvedLinks = 0;
	let selfLinks = 0;

	for (const passage of story.passages) {
		for (const link of parseLinks(passage.text, true)) {
			links++;

			const target = passageByName.get(link);

			if (!target) {
				brokenLinks++;
			} else if (target.id === passage.id) {
				selfLinks++;
			} else {
				resolvedLinks++;
				incoming.set(target.id, (incoming.get(target.id) ?? 0) + 1);
			}
		}
	}

	const reachable = new Set<string>();
	const queue = [story.startPassage];

	while (queue.length > 0) {
		const id = queue.shift()!;

		if (reachable.has(id)) {
			continue;
		}

		reachable.add(id);

		const passage = story.passages.find(candidate => candidate.id === id);

		if (passage) {
			for (const link of parseLinks(passage.text, true)) {
				const target = passageByName.get(link);

				if (target && target.id !== id) {
					queue.push(target.id);
				}
			}
		}
	}

	return {
		brokenLinks,
		emptyPassages: story.passages.filter(passage => passage.text.trim() === '')
			.length,
		links,
		orphanPassages: story.passages.filter(
			passage =>
				passage.id !== story.startPassage &&
				(incoming.get(passage.id) ?? 0) === 0
		).length,
		passages: story.passages.length,
		resolvedLinks,
		selfLinks,
		taggedPassages: story.passages.filter(passage => passage.tags.length > 0)
			.length,
		unreachablePassages: story.passages.filter(
			passage => !reachable.has(passage.id)
		).length
	};
}

function diagnosticsForStory(story: Story): CoreDiagnostic[] {
	const passageByName = new Map(
		story.passages.map(passage => [passage.name, passage])
	);
	const reachable = new Set<string>();
	const queue = [story.startPassage];
	const diagnostics: CoreDiagnostic[] = [];

	for (const passage of story.passages) {
		for (const link of parseLinks(passage.text, true)) {
			if (!passageByName.has(link)) {
				diagnostics.push({
					code: 'broken-link',
					message: `Broken link to "${link}"`,
					passageId: passage.id,
					severity: 'warning',
					sourceId: passage.id
				});
			}
		}
	}

	while (queue.length > 0) {
		const id = queue.shift()!;

		if (reachable.has(id)) {
			continue;
		}

		reachable.add(id);

		const passage = story.passages.find(candidate => candidate.id === id);

		if (passage) {
			for (const link of parseLinks(passage.text, true)) {
				const target = passageByName.get(link);

				if (target && target.id !== id) {
					queue.push(target.id);
				}
			}
		}
	}

	for (const passage of story.passages) {
		if (!reachable.has(passage.id)) {
			diagnostics.push({
				code: 'unreachable-passage',
				message: 'Passage is not reachable from the start passage',
				passageId: passage.id,
				severity: 'info',
				sourceId: passage.id
			});
		}
	}

	return diagnostics;
}

export function storyToCoreIndex(story: Story, query = ''): CoreStoryIndex {
	const tags = Array.from(
		story.passages.reduce((result, passage) => {
			passage.tags.forEach(tag => result.add(tag));
			return result;
		}, new Set<string>())
	).sort();
	const files: CoreSourceFile[] = [
		...story.passages.map(sourceFileForPassage),
		{
			characterCount: story.script.length,
			id: `${story.id}:script`,
			kind: 'script',
			lineCount: lineCount(story.script),
			name: 'Story JavaScript',
			passageId: null,
			tags: []
		},
		{
			characterCount: story.stylesheet.length,
			id: `${story.id}:stylesheet`,
			kind: 'stylesheet',
			lineCount: lineCount(story.stylesheet),
			name: 'Story Stylesheet',
			passageId: null,
			tags: []
		}
	];
	const searchHits = story.passages.flatMap(passage => [
		...searchHitsInSource(
			query,
			passage.id,
			passage.name,
			passage.name,
			'passageName'
		),
		...searchHitsInSource(
			query,
			passage.id,
			passage.name,
			passage.text,
			'passageText'
		),
		...passage.tags.flatMap(tag =>
			searchHitsInSource(query, passage.id, passage.name, tag, 'passageTag')
		)
	]);

	searchHits.push(
		...searchHitsInSource(
			query,
			`${story.id}:script`,
			'Story JavaScript',
			story.script,
			'script'
		),
		...searchHitsInSource(
			query,
			`${story.id}:stylesheet`,
			'Story Stylesheet',
			story.stylesheet,
			'stylesheet'
		)
	);

	return {
		diagnostics: diagnosticsForStory(story),
		files,
		graph: graphStats(story),
		searchHits,
		storyId: story.id,
		tags
	};
}
