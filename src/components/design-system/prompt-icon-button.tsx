import * as React from 'react';
import * as ReactDOM from 'react-dom';
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
	onCancel?: () => void;
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
	onCancel,
	onSubmit,
	prompt,
	validate,
	value
}) => {
	const [open, setOpen] = React.useState(false);
	const [position, setPosition] = React.useState<React.CSSProperties>();
	const buttonRef = React.useRef<HTMLButtonElement | null>(null);
	const popoverRef = React.useRef<HTMLFormElement | null>(null);
	const validation = React.useMemo(
		() => validate?.(value) ?? {valid: true},
		[validate, value]
	);

	const updatePosition = React.useCallback(() => {
		const button = buttonRef.current;

		if (!button) {
			return;
		}

		const gap = 8;
		const margin = 12;
		const buttonRect = button.getBoundingClientRect();
		const popover = popoverRef.current;
		const popoverWidth = popover?.offsetWidth ?? 320;
		const popoverHeight = popover?.offsetHeight ?? 0;
		const left = Math.max(
			margin,
			Math.min(buttonRect.left, window.innerWidth - popoverWidth - margin)
		);
		const topBelow = buttonRect.bottom + gap;
		const topAbove = buttonRect.top - popoverHeight - gap;
		const top =
			popoverHeight > 0 &&
			topBelow + popoverHeight > window.innerHeight - margin &&
			topAbove >= margin
				? topAbove
				: topBelow;

		setPosition({
			left,
			top,
			maxWidth: `calc(100vw - ${margin * 2}px)`,
			position: 'fixed'
		});
	}, []);

	React.useLayoutEffect(() => {
		if (!open) {
			return;
		}

		updatePosition();
	}, [open, updatePosition]);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setOpen(false);
				onCancel?.();
			}
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target as Node;

			if (
				buttonRef.current?.contains(target) ||
				popoverRef.current?.contains(target)
			) {
				return;
			}

			setOpen(false);
			onCancel?.();
		}

		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('pointerdown', handlePointerDown, true);
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('pointerdown', handlePointerDown, true);
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
		};
	}, [onCancel, open, updatePosition]);

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (!validation.valid) {
			return;
		}

		onSubmit(value);
		setOpen(false);
	}

	function handleCancel() {
		onCancel?.();
		setOpen(false);
	}

	const popover =
		open &&
		ReactDOM.createPortal(
			<form
				aria-label={prompt}
				className="tw-prompt-icon__pop"
				onSubmit={handleSubmit}
				ref={popoverRef}
				role="dialog"
				style={position}
			>
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
					<Button icon="x" onClick={handleCancel} size="sm" variant="ghost">
						{cancelLabel}
					</Button>
				</div>
			</form>,
			document.body
		);

	return (
		<span className="tw-prompt-icon">
			<IconButton
				disabled={disabled}
				icon={icon}
				label={label}
				onClick={() =>
					setOpen(value => {
						if (value) {
							onCancel?.();
						}

						return !value;
					})
				}
				ref={buttonRef}
			/>
			{popover}
		</span>
	);
};
