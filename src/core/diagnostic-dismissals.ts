import type {CoreDiagnostic} from './bindings/CoreDiagnostic';

export const diagnosticDismissalsChangedEvent =
	'twine-diagnostic-dismissals-changed';

export interface DiagnosticDismissalsChangedDetail {
	storyId: string;
}

function storageKey(storyId: string) {
	return `twine-diagnostic-dismissals-${storyId}`;
}

function browserStorage() {
	return typeof window === 'undefined' ? undefined : window.localStorage;
}

export function diagnosticIdentity(diagnostic: CoreDiagnostic) {
	return JSON.stringify([
		diagnostic.code,
		diagnostic.sourceId,
		diagnostic.passageId,
		diagnostic.start,
		diagnostic.end,
		diagnostic.message
	]);
}

export function loadDismissedDiagnosticIds(storyId: string) {
	const storage = browserStorage();

	if (!storage) {
		return new Set<string>();
	}

	try {
		const serialized = storage.getItem(storageKey(storyId));
		const parsed = serialized ? JSON.parse(serialized) : [];

		return new Set(
			Array.isArray(parsed)
				? parsed.filter(value => typeof value === 'string')
				: []
		);
	} catch {
		return new Set<string>();
	}
}

export function saveDismissedDiagnosticIds(storyId: string, ids: Set<string>) {
	const storage = browserStorage();
	const sorted = Array.from(ids).sort();

	if (storage) {
		if (sorted.length === 0) {
			storage.removeItem(storageKey(storyId));
		} else {
			storage.setItem(storageKey(storyId), JSON.stringify(sorted));
		}
	}

	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent<DiagnosticDismissalsChangedDetail>(
				diagnosticDismissalsChangedEvent,
				{detail: {storyId}}
			)
		);
	}
}

export function isDiagnosticDismissed(
	diagnostic: CoreDiagnostic,
	dismissedIds: Set<string>
) {
	return dismissedIds.has(diagnosticIdentity(diagnostic));
}
