import {
	Compartment,
	EditorState,
	Extension,
	RangeSetBuilder
} from '@codemirror/state';
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab
} from '@codemirror/commands';
import {
	bracketMatching,
	defaultHighlightStyle,
	foldGutter,
	foldKeymap,
	indentOnInput,
	syntaxHighlighting
} from '@codemirror/language';
import {
	autocompletion,
	closeBrackets,
	closeBracketsKeymap,
	CompletionContext
} from '@codemirror/autocomplete';
import {css} from '@codemirror/lang-css';
import {html} from '@codemirror/lang-html';
import {javascript} from '@codemirror/lang-javascript';
import {highlightSelectionMatches, searchKeymap} from '@codemirror/search';
import {
	Decoration,
	DecorationSet,
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	placeholder,
	ViewPlugin,
	ViewUpdate
} from '@codemirror/view';
import * as React from 'react';
import './source-editor.css';

export type SourceEditorLanguage =
	| 'css'
	| 'html'
	| 'javascript'
	| 'text'
	| 'twine';

export interface SourceEditorProps {
	autocompletePassageNames?: string[];
	brokenLinkNames?: string[];
	id: string;
	label: string;
	language?: SourceEditorLanguage;
	memoryKey?: string;
	onChange: (value: string) => void;
	placeholderText?: string;
	readOnly?: boolean;
	selfLinkName?: string;
	value: string;
}

interface SourceEditorMemory {
	anchor?: number;
	head?: number;
	scrollLeft?: number;
	scrollTop?: number;
}

const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();
const autocompleteCompartment = new Compartment();
const linkDecorationCompartment = new Compartment();
const wrappingCompartment = new Compartment();

function languageExtension(language: SourceEditorLanguage): Extension {
	switch (language) {
		case 'css':
			return css();
		case 'html':
			return html();
		case 'javascript':
			return javascript();
		case 'text':
		case 'twine':
			return [];
	}
}

function loadMemory(memoryKey?: string): SourceEditorMemory {
	if (!memoryKey) {
		return {};
	}

	try {
		return JSON.parse(
			window.localStorage.getItem(`twine-source-editor-${memoryKey}`) ?? '{}'
		);
	} catch {
		return {};
	}
}

function saveMemory(memoryKey: string | undefined, memory: SourceEditorMemory) {
	if (!memoryKey) {
		return;
	}

	try {
		window.localStorage.setItem(
			`twine-source-editor-${memoryKey}`,
			JSON.stringify(memory)
		);
	} catch {
		// Memory is a convenience; storage failures should not block editing.
	}
}

function completionSource(passageNames: string[] = []) {
	return (context: CompletionContext) => {
		const match = context.matchBefore(/(?:\[\[|->|<-|\|)[^\]\n\r]*$/);

		if (!match || (match.from === context.pos && !context.explicit)) {
			return null;
		}

		const prefix =
			match.text.match(/(?:\[\[|->|<-|\|)([^\]\n\r]*)$/)?.[1] ?? '';

		return {
			from: context.pos - prefix.length,
			options: passageNames.map(name => ({label: name, type: 'text'}))
		};
	};
}

function targetFromLinkContent(content: string) {
	const editable = content.split('][')[0];

	if (editable.includes('->')) {
		return editable.split('->').pop()?.trim() ?? '';
	}

	if (editable.includes('<-')) {
		return editable.split('<-')[0].trim();
	}

	if (editable.includes('|')) {
		return editable.split('|').pop()?.trim() ?? '';
	}

	return editable.trim();
}

function twineLinkDecorations(
	brokenLinkNames: string[] = [],
	selfLinkName?: string
) {
	const broken = new Set(brokenLinkNames);

	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = this.build(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged) {
					this.decorations = this.build(update.view);
				}
			}

			build(view: EditorView) {
				const builder = new RangeSetBuilder<Decoration>();

				for (const {from, to} of view.visibleRanges) {
					const text = view.state.doc.sliceString(from, to);
					const linkPattern = /\[\[(.*?)\]\]/g;
					let match: RegExpExecArray | null;

					while ((match = linkPattern.exec(text))) {
						const target = targetFromLinkContent(match[1]);
						const className =
							target === selfLinkName
								? 'cm-twine-link-self'
								: broken.has(target)
									? 'cm-twine-link-broken'
									: 'cm-twine-link';

						builder.add(
							from + match.index,
							from + match.index + match[0].length,
							Decoration.mark({class: className})
						);
					}
				}

				return builder.finish();
			}
		},
		{
			decorations: value => value.decorations
		}
	);
}

function baseExtensions(props: SourceEditorProps): Extension[] {
	return [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightSpecialChars(),
		history(),
		foldGutter(),
		drawSelection(),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),
		highlightActiveLine(),
		highlightSelectionMatches(),
		placeholder(props.placeholderText ?? ''),
		syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
		autocompleteCompartment.of(
			autocompletion({
				override: [completionSource(props.autocompletePassageNames)]
			})
		),
		linkDecorationCompartment.of(
			twineLinkDecorations(props.brokenLinkNames, props.selfLinkName)
		),
		keymap.of([
			indentWithTab,
			...defaultKeymap,
			...historyKeymap,
			...foldKeymap,
			...closeBracketsKeymap,
			...searchKeymap
		]),
		languageCompartment.of(languageExtension(props.language ?? 'twine')),
		readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly ?? false)),
		wrappingCompartment.of(EditorView.lineWrapping)
	];
}

export const SourceEditor: React.FC<SourceEditorProps> = props => {
	const editorContainer = React.useRef<HTMLDivElement>(null);
	const viewRef = React.useRef<EditorView>();
	const onChange = React.useRef(props.onChange);

	React.useEffect(() => {
		onChange.current = props.onChange;
	}, [props.onChange]);

	React.useEffect(() => {
		if (!editorContainer.current) {
			return;
		}

		const memory = loadMemory(props.memoryKey);
		const view = new EditorView({
			parent: editorContainer.current,
			state: EditorState.create({
				doc: props.value,
				selection:
					memory.anchor !== undefined && memory.head !== undefined
						? {anchor: memory.anchor, head: memory.head}
						: undefined,
				extensions: [
					...baseExtensions(props),
					EditorView.updateListener.of(update => {
						if (update.docChanged) {
							onChange.current(update.state.doc.toString());
						}

						if (update.docChanged || update.selectionSet) {
							saveMemory(props.memoryKey, {
								anchor: update.state.selection.main.anchor,
								head: update.state.selection.main.head,
								scrollLeft: update.view.scrollDOM.scrollLeft,
								scrollTop: update.view.scrollDOM.scrollTop
							});
						}
					}),
					EditorView.domEventHandlers({
						scroll: (_event, currentView) => {
							saveMemory(props.memoryKey, {
								anchor: currentView.state.selection.main.anchor,
								head: currentView.state.selection.main.head,
								scrollLeft: currentView.scrollDOM.scrollLeft,
								scrollTop: currentView.scrollDOM.scrollTop
							});
						}
					})
				]
			})
		});

		viewRef.current = view;
		window.requestAnimationFrame(() => {
			view.scrollDOM.scrollTo({
				left: memory.scrollLeft ?? 0,
				top: memory.scrollTop ?? 0
			});
			view.focus();
		});

		return () => {
			view.destroy();
			viewRef.current = undefined;
		};
		// The editor must be recreated when the memory key changes to restore the
		// correct selection for a newly selected passage.
	}, [props.memoryKey]);

	React.useEffect(() => {
		const view = viewRef.current;

		if (!view || view.state.doc.toString() === props.value) {
			return;
		}

		view.dispatch({
			changes: {from: 0, to: view.state.doc.length, insert: props.value}
		});
	}, [props.value]);

	React.useEffect(() => {
		const view = viewRef.current;

		view?.dispatch({
			effects: languageCompartment.reconfigure(
				languageExtension(props.language ?? 'twine')
			)
		});
	}, [props.language]);

	React.useEffect(() => {
		const view = viewRef.current;

		view?.dispatch({
			effects: readOnlyCompartment.reconfigure(
				EditorState.readOnly.of(props.readOnly ?? false)
			)
		});
	}, [props.readOnly]);

	React.useEffect(() => {
		const view = viewRef.current;

		view?.dispatch({
			effects: autocompleteCompartment.reconfigure(
				autocompletion({
					override: [completionSource(props.autocompletePassageNames)]
				})
			)
		});
	}, [props.autocompletePassageNames]);

	React.useEffect(() => {
		const view = viewRef.current;

		view?.dispatch({
			effects: linkDecorationCompartment.reconfigure(
				twineLinkDecorations(props.brokenLinkNames, props.selfLinkName)
			)
		});
	}, [props.brokenLinkNames, props.selfLinkName]);

	return (
		<div className="source-editor">
			<label className="screen-reader-only" htmlFor={props.id}>
				{props.label}
			</label>
			<div
				aria-label={props.label}
				id={props.id}
				ref={editorContainer}
				role="textbox"
			/>
		</div>
	);
};
