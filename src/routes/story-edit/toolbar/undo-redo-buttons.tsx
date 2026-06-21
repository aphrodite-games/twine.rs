import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useUndoableStoriesContext} from '../../../store/undoable-stories';
import {IconButton} from '../../../components/design-system';

export const UndoRedoButtons: React.FC = () => {
	const {redo, redoLabel, undo, undoLabel} = useUndoableStoriesContext();
	const {t} = useTranslation();

	return (
		<>
			<IconButton
				disabled={!undo}
				icon="arrow-back"
				label={undoLabel ?? t('common.undo')}
				onClick={undo}
			/>
			<IconButton
				disabled={!redo}
				icon="arrow-forward"
				label={redoLabel ?? t('common.redo')}
				onClick={redo}
			/>
		</>
	);
};
