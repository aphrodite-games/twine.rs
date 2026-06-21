import * as React from 'react';
import {useTranslation} from 'react-i18next';
import {useHistory} from 'react-router-dom';
import {IconButton} from '../components/design-system';
import {AboutTwineDialog, AppPrefsDialog, useDialogsContext} from '../dialogs';

export const AppActions: React.FC = () => {
	const {dispatch} = useDialogsContext();
	const history = useHistory();
	const {t} = useTranslation();

	return (
		<div className="route-action-group">
			<IconButton
				icon="settings"
				label={t('routeActions.app.preferences')}
				onClick={() => dispatch({type: 'addDialog', component: AppPrefsDialog})}
			/>
			<IconButton
				disabled={history.location.pathname === '/formats'}
				icon="file-code"
				label={t('routeActions.app.storyFormats')}
				onClick={() => history.push('/formats')}
			/>
			<IconButton
				icon="award"
				label={t('routeActions.app.aboutApp')}
				onClick={() =>
					dispatch({type: 'addDialog', component: AboutTwineDialog})
				}
			/>
			<IconButton
				icon="bug"
				label={t('routeActions.app.reportBug')}
				onClick={() => window.open('https://twinery.org/2bugs', '_blank')}
			/>
		</div>
	);
};
