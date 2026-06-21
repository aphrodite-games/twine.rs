import * as React from 'react';
import {Badge} from './badge';
import {Button} from './button';
import {IconButton} from './icon-button';
import {Input} from './input';
import './design-system.css';

export interface PromptValidationResponse {
	message?: string;
	valid: boolean;
}

export interface PromptIconButtonProps {
	cancelLabel: string;
	confirmLabel: string;
	disabled?: boolean;
	icon: string;
	label: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	prompt: string;
	validate?: (value: string) => PromptValidationResponse;
	value: string;
}

export const PromptIconButton: React.FC<PromptIconButtonProps> = ({
	cancelLabel,
	confirmLabel,
	disabled = false,
	icon,
	label,
	onChange,
	onSubmit,
	prompt,
	validate,
	value
}) => {
	const [open, setOpen] = React.useState(false);
	const validation = React.useMemo(
		() => validate?.(value) ?? {valid: true},
		[validate, value]
	);

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (!validation.valid) {
			return;
		}

		onSubmit(value);
		setOpen(false);
	}

	return (
		<span className="tw-prompt-icon">
			<IconButton
				disabled={disabled}
				icon={icon}
				label={label}
				onClick={() => setOpen(value => !value)}
			/>
			{open && (
				<form className="tw-prompt-icon__pop" onSubmit={handleSubmit}>
					<Input
						autoFocus
						block
						invalid={!validation.valid}
						label={prompt}
						onChange={event => onChange(event.target.value)}
						value={value}
					/>
					{validation.message && (
						<Badge icon="alert-octagon" tone="error">
							{validation.message}
						</Badge>
					)}
					<div className="tw-prompt-icon__actions">
						<Button
							disabled={!validation.valid}
							icon="check"
							size="sm"
							type="submit"
							variant="primary"
						>
							{confirmLabel}
						</Button>
						<Button
							icon="x"
							onClick={() => setOpen(false)}
							size="sm"
							variant="ghost"
						>
							{cancelLabel}
						</Button>
					</div>
				</form>
			)}
		</span>
	);
};
