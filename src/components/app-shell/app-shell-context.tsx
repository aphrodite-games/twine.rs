import * as React from 'react';

export interface RouteToolbarRegistration {
	helpUrl: string;
	pinnedControls?: React.ReactNode;
	tabs: Record<string, React.ReactNode>;
}

export interface AppShellContextValue {
	inShell: boolean;
	setRouteToolbar: (registration: RouteToolbarRegistration | undefined) => void;
}

const defaultContext: AppShellContextValue = {
	inShell: false,
	setRouteToolbar: () => undefined
};

export const AppShellContext =
	React.createContext<AppShellContextValue>(defaultContext);

export function useAppShellContext() {
	return React.useContext(AppShellContext);
}
