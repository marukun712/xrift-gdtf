export interface GdtfDmxValue {
	value: number;
	byteCount: number;
}

export function parseGdtfDmxValue(raw: string | null): GdtfDmxValue | null {
	if (!raw) return null;
	const [valuePart, byteCountPart] = raw.split("/");
	const value = Number.parseFloat(valuePart);
	const byteCount = byteCountPart ? Number.parseInt(byteCountPart, 10) : 1;
	if (Number.isNaN(value) || Number.isNaN(byteCount) || byteCount < 1)
		return null;
	return { value, byteCount };
}

export function gdtfDmxValueMax(value: GdtfDmxValue): number {
	return 256 ** value.byteCount - 1;
}

export interface GdtfChannelFunction {
	name: string;
	attribute: string;
	dmxFrom: GdtfDmxValue;
	physicalFrom: number;
	physicalTo: number;
	wheelName: string | null;
}

export interface GdtfDmxChannel {
	geometryName: string;
	offset: number[];
	attribute: string;
	functions: GdtfChannelFunction[];
}

export interface GdtfWheelSlot {
	name: string;
	color: [number, number, number] | null;
	mediaFileName: string | null;
}

export interface GdtfWheel {
	name: string;
	slots: GdtfWheelSlot[];
}

export interface GdtfDmxProfile {
	modeName: string;
	channels: GdtfDmxChannel[];
	wheels: Map<string, GdtfWheel>;
	geometryNames: string[];
}

function parseWheels(doc: Document): Map<string, GdtfWheel> {
	const wheels = new Map<string, GdtfWheel>();
	for (const wheelElement of doc.querySelectorAll(
		"FixtureType > Wheels > Wheel",
	)) {
		const name = wheelElement.getAttribute("Name");
		if (!name) continue;
		const slots: GdtfWheelSlot[] = [];
		for (const slotElement of wheelElement.querySelectorAll("Slot")) {
			const colorAttr = slotElement.getAttribute("Color");
			const colorParts =
				colorAttr?.split(",").map((token) => Number.parseFloat(token)) ?? [];
			slots.push({
				name: slotElement.getAttribute("Name") ?? "",
				color:
					colorParts.length === 3 &&
					colorParts.every((part) => !Number.isNaN(part))
						? (colorParts as [number, number, number])
						: null,
				mediaFileName: slotElement.getAttribute("MediaFileName"),
			});
		}
		wheels.set(name, { name, slots });
	}
	return wheels;
}

function parseGeometryNames(doc: Document): string[] {
	const names: string[] = [];
	for (const element of doc.querySelectorAll("FixtureType > Geometries *")) {
		const name = element.getAttribute("Name");
		if (name) names.push(name);
	}
	return names;
}

function channelFunctionFromElement(
	element: Element,
): GdtfChannelFunction | null {
	const dmxFrom = parseGdtfDmxValue(element.getAttribute("DMXFrom"));
	if (!dmxFrom) return null;
	return {
		name: element.getAttribute("Name") ?? "",
		attribute: element.getAttribute("Attribute") ?? "",
		dmxFrom,
		physicalFrom: Number.parseFloat(
			element.getAttribute("PhysicalFrom") ?? "0",
		),
		physicalTo: Number.parseFloat(element.getAttribute("PhysicalTo") ?? "1"),
		wheelName: element.getAttribute("Wheel"),
	};
}

function dmxChannelFromElement(element: Element): GdtfDmxChannel | null {
	const geometryName = element.getAttribute("Geometry");
	if (!geometryName) return null;

	const offsetAttr = element.getAttribute("Offset");
	const offset =
		offsetAttr && offsetAttr !== "None"
			? offsetAttr
					.split(",")
					.map((token) => Number.parseInt(token, 10))
					.filter((n) => !Number.isNaN(n))
			: [];

	const logicalChannel = element.querySelector("LogicalChannel");
	if (!logicalChannel) return null;

	const functions: GdtfChannelFunction[] = [];
	for (const functionElement of logicalChannel.querySelectorAll(
		"ChannelFunction",
	)) {
		const channelFunction = channelFunctionFromElement(functionElement);
		if (channelFunction) functions.push(channelFunction);
	}
	functions.sort((a, b) => a.dmxFrom.value - b.dmxFrom.value);

	return {
		geometryName,
		offset,
		attribute: logicalChannel.getAttribute("Attribute") ?? "",
		functions,
	};
}

function selectSmallestDmxMode(doc: Document): Element | null {
	let selected: Element | null = null;
	let selectedFootprint = Number.POSITIVE_INFINITY;

	for (const modeElement of doc.querySelectorAll(
		"FixtureType > DMXModes > DMXMode",
	)) {
		let footprint = 0;
		for (const channelElement of modeElement.querySelectorAll(
			"DMXChannels > DMXChannel",
		)) {
			const offsetAttr = channelElement.getAttribute("Offset");
			if (!offsetAttr || offsetAttr === "None") continue;
			for (const token of offsetAttr.split(",")) {
				const n = Number.parseInt(token, 10);
				if (!Number.isNaN(n)) footprint = Math.max(footprint, n);
			}
		}
		if (footprint > 0 && footprint < selectedFootprint) {
			selected = modeElement;
			selectedFootprint = footprint;
		}
	}
	return selected;
}

export function parseGdtfDmxProfile(xmlText: string): GdtfDmxProfile {
	const doc = new DOMParser().parseFromString(xmlText, "application/xml");
	if (doc.querySelector("parsererror")) {
		throw new Error("xmlの解析に失敗しました");
	}

	const modeElement = selectSmallestDmxMode(doc);
	const channels: GdtfDmxChannel[] = [];
	if (modeElement) {
		for (const channelElement of modeElement.querySelectorAll(
			"DMXChannels > DMXChannel",
		)) {
			const channel = dmxChannelFromElement(channelElement);
			if (channel) channels.push(channel);
		}
	}

	return {
		modeName: modeElement?.getAttribute("Name") ?? "",
		channels,
		wheels: parseWheels(doc),
		geometryNames: parseGeometryNames(doc),
	};
}

export function resolvePhysicalValue(
	channel: GdtfDmxChannel,
	normalizedValue: number,
): number | null {
	if (channel.functions.length === 0) return null;

	let targetIndex = 0;
	for (let i = 0; i < channel.functions.length; i++) {
		const fromNormalized =
			channel.functions[i].dmxFrom.value /
			gdtfDmxValueMax(channel.functions[i].dmxFrom);
		if (fromNormalized <= normalizedValue) {
			targetIndex = i;
		}
	}

	const target = channel.functions[targetIndex];
	const nextFunction = channel.functions[targetIndex + 1];
	const fromNormalized = target.dmxFrom.value / gdtfDmxValueMax(target.dmxFrom);
	const toNormalized = nextFunction
		? nextFunction.dmxFrom.value / gdtfDmxValueMax(nextFunction.dmxFrom)
		: 1;
	const span = toNormalized - fromNormalized;
	const localFraction =
		span > 0 ? (normalizedValue - fromNormalized) / span : 0;

	return (
		target.physicalFrom +
		localFraction * (target.physicalTo - target.physicalFrom)
	);
}
