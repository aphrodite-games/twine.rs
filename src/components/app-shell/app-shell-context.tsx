import * as React from 'react';

export interface ShellToolbarRegistration {
	helpUrl?: string;
	pinnedControls?: React.ReactNode;
	tabs: Record<string, React.ReactNode>;
}

export interface ShellDockRegistration {
	content: React.ReactNode;
	label: string;
}

export interface AppShellContextValue {
	inShell: boolean;
	setDock: (registration: ShellDockRegistration | undefined) => void;
	setToolbar: (registration: ShellToolbarRegistration | undefined) => void;
}

const defaultContext: AppShellContextValue = {
	inShell: false,
	setDock: () => undefined,
	setToolbar: () => undefined
};

export const AppShellContext =
	React.createContext<AppShellContextValue>(defaultContext);

export function useAppShellContext() {
	return React.useContext(AppShellContext);
}
