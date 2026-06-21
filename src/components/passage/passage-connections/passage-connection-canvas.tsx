import * as React from 'react';
import {Passage, passageConnections} from '../../../store/stories';
import {Point, rectCenter} from '../../../util/geometry';
import {useFormatReferenceParser} from '../../../store/use-format-reference-parser';

export interface PassageConnectionCanvasProps {
	formatName: string;
	formatVersion: string;
	height: number;
	layers?: PassageConnectionCanvasLayers;
	offset: Point;
	passages: Passage[];
	startPassageId: string;
	visiblePassages: Passage[];
	width: number;
}

export interface PassageConnectionCanvasLayers {
	broken: boolean;
	resolved: boolean;
	selfLinks: boolean;
}

const defaultLayers: PassageConnectionCanvasLayers = {
	broken: true,
	resolved: true,
	selfLinks: true
};

interface DrawColors {
	broken: string;
	reference: string;
	resolved: string;
	self: string;
	start: string;
}

function color(name: string, fallback: string) {
	const value = window
		.getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();

	return value || fallback;
}

function colors(): DrawColors {
	return {
		broken: color('--dark-red', '#9b1c1c'),
		reference: color('--dark-blue', '#1f4c8f'),
		resolved: color('--gray', '#777'),
		self: color('--dark-green', '#137333'),
		start: color('--dark-green', '#137333')
	};
}

function offsetPassage(passage: Passage, offset: Point) {
	if (!passage.selected) {
		return passage;
	}

	return {
		...passage,
		left: passage.left + offset.left,
		top: passage.top + offset.top
	};
}

function drawArrow(
	context: CanvasRenderingContext2D,
	start: Point,
	end: Point
) {
	const angle = Math.atan2(end.top - start.top, end.left - start.left);
	const size = 8;

	context.beginPath();
	context.moveTo(end.left, end.top);
	context.lineTo(
		end.left - size * Math.cos(angle - Math.PI / 6),
		end.top - size * Math.sin(angle - Math.PI / 6)
	);
	context.lineTo(
		end.left - size * Math.cos(angle + Math.PI / 6),
		end.top - size * Math.sin(angle + Math.PI / 6)
	);
	context.closePath();
	context.fill();
}

function drawLine(
	context: CanvasRenderingContext2D,
	start: Point,
	end: Point,
	strokeStyle: string,
	dash: number[] = []
) {
	context.save();
	context.strokeStyle = strokeStyle;
	context.fillStyle = strokeStyle;
	context.lineWidth = 2;
	context.setLineDash(dash);
	context.beginPath();
	context.moveTo(start.left, start.top);
	context.lineTo(end.left, end.top);
	context.stroke();
	context.setLineDash([]);
	drawArrow(context, start, end);
	context.restore();
}

function drawSelfLink(
	context: CanvasRenderingContext2D,
	passage: Passage,
	strokeStyle: string,
	dash: number[] = []
) {
	const radius = Math.min(passage.width, passage.height) * 0.35;
	const center = {
		left: passage.left + passage.width,
		top: passage.top + passage.height * 0.35
	};

	context.save();
	context.strokeStyle = strokeStyle;
	context.fillStyle = strokeStyle;
	context.lineWidth = 2;
	context.setLineDash(dash);
	context.beginPath();
	context.arc(center.left, center.top, radius, Math.PI * 0.65, Math.PI * 2.2);
	context.stroke();
	context.setLineDash([]);
	drawArrow(
		context,
		{left: center.left, top: center.top - radius},
		{
			left: passage.left + passage.width,
			top: passage.top + passage.height * 0.1
		}
	);
	context.restore();
}

function drawConnections(
	context: CanvasRenderingContext2D,
	connections: ReturnType<typeof passageConnections>,
	visibleIds: Set<string>,
	offset: Point,
	palette: DrawColors,
	layers: PassageConnectionCanvasLayers,
	variant: 'link' | 'reference'
) {
	const stroke = variant === 'reference' ? palette.reference : palette.resolved;
	const dash = variant === 'reference' ? [5, 4] : [];

	if (layers.resolved) {
		for (const [source, targets] of [
			...connections.fixed.connections,
			...connections.draggable.connections
		]) {
			for (const target of targets) {
				if (!visibleIds.has(source.id) && !visibleIds.has(target.id)) {
					continue;
				}

				const start = rectCenter(offsetPassage(source, offset));
				const end = rectCenter(offsetPassage(target, offset));

				drawLine(context, start, end, stroke, dash);
			}
		}
	}

	if (layers.selfLinks) {
		for (const source of [
			...connections.fixed.self,
			...connections.draggable.self
		]) {
			if (visibleIds.has(source.id)) {
				drawSelfLink(
					context,
					offsetPassage(source, offset),
					palette.self,
					dash
				);
			}
		}
	}

	if (layers.broken) {
		for (const source of [
			...connections.fixed.broken,
			...connections.draggable.broken
		]) {
			if (!visibleIds.has(source.id)) {
				continue;
			}

			const passage = offsetPassage(source, offset);

			drawLine(
				context,
				{left: passage.left + passage.width, top: passage.top + passage.height},
				{
					left: passage.left + passage.width + 35,
					top: passage.top + passage.height + 35
				},
				palette.broken
			);
		}
	}
}

export const PassageConnectionCanvas: React.FC<
	PassageConnectionCanvasProps
> = props => {
	const {
		formatName,
		formatVersion,
		height,
		layers = defaultLayers,
		offset,
		passages,
		startPassageId,
		visiblePassages,
		width
	} = props;
	const canvas = React.useRef<HTMLCanvasElement>(null);
	const referenceParser = useFormatReferenceParser(formatName, formatVersion);
	const visibleIds = React.useMemo(
		() => new Set(visiblePassages.map(passage => passage.id)),
		[visiblePassages]
	);
	const linkConnections = React.useMemo(
		() => passageConnections(passages),
		[passages]
	);
	const referenceConnections = React.useMemo(
		() => passageConnections(passages, referenceParser),
		[passages, referenceParser]
	);

	React.useLayoutEffect(() => {
		const element = canvas.current;

		if (!element) {
			return;
		}

		const ratio = window.devicePixelRatio || 1;
		const context = element.getContext('2d');

		if (!context) {
			return;
		}

		element.width = Math.max(1, Math.ceil(width * ratio));
		element.height = Math.max(1, Math.ceil(height * ratio));
		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);

		const palette = colors();
		const startPassage = passages.find(
			passage => passage.id === startPassageId
		);

		if (startPassage && visibleIds.has(startPassage.id)) {
			const passage = offsetPassage(startPassage, offset);

			drawLine(
				context,
				{left: passage.left - 50, top: passage.top + passage.height / 2},
				{left: passage.left, top: passage.top + passage.height / 2},
				palette.start
			);
		}

		drawConnections(
			context,
			linkConnections,
			visibleIds,
			offset,
			palette,
			layers,
			'link'
		);
		drawConnections(
			context,
			referenceConnections,
			visibleIds,
			offset,
			palette,
			layers,
			'reference'
		);
	}, [
		height,
		layers,
		linkConnections,
		offset,
		passages,
		referenceConnections,
		startPassageId,
		visibleIds,
		width
	]);

	return (
		<canvas
			aria-hidden
			className="link-connectors"
			data-offset-left={offset.left}
			data-offset-top={offset.top}
			data-visible-passages={visiblePassages.length}
			ref={canvas}
			style={{height, width}}
		/>
	);
};
