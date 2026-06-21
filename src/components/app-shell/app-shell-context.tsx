import * as React from 'react';

export interface ShellToolbarRegistration {
	helpUrl?: string;
	pinnedControls?: React.ReactNode;
	tabs: Record<string, React.ReactNode>;
}

export interface AppShellContextValue {
	inShell: boolean;
	setToolbar: (registration: ShellToolbarRegistration | undefined) => void;
}

const defaultContext: AppShellContextValue = {
	inShell: false,
	setToolbar: () => undefined
};

export const AppShellContext =
	React.createContext<AppShellContextValue>(defaultContext);

export function useAppShellContext() {
	return React.useContext(AppShellContext);
}
