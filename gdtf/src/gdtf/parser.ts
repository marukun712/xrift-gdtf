export interface DmxFunction {
	geometry: string;
	attribute: string;
	offset: number;
	bytes: number;
	dmxFrom: number;
	dmxTo: number;
	physicalFrom: number;
	physicalTo: number;
}

export function parseXML(xmlText: string, modeName?: string) {
	const doc = new DOMParser().parseFromString(xmlText, "application/xml");
	if (doc.querySelector("parsererror"))
		throw new Error("xmlの解析に失敗しました");

	const modes = [...doc.querySelectorAll("FixtureType > DMXModes > DMXMode")];
	const mode = modeName
		? modes.find((m) => m.getAttribute("Name") === modeName)
		: modes[0];
	if (!mode) throw new Error("DMXModeが見つかりません");

	const result: DmxFunction[] = [];
	const channels = mode.querySelectorAll(":scope > DMXChannels > DMXChannel");
	let count = 0;
	for (const ch of channels) {
		const offsets = (ch.getAttribute("Offset") ?? "")
			.split(",")
			.map(Number)
			.filter((n) => n > 0);
		if (offsets.length === 0) continue;
		const bytes = offsets.length;
		count += bytes;

		const fs = [
			...ch.querySelectorAll(":scope > LogicalChannel > ChannelFunction"),
		]
			.map((cf): DmxFunction => {
				const [v, n = "1"] = (cf.getAttribute("DMXFrom") ?? "0/1").split("/");
				return {
					geometry: ch.getAttribute("Geometry") ?? "",
					attribute: cf.getAttribute("Attribute") ?? "",
					offset: offsets[0] - 1,
					bytes,
					dmxFrom: Math.floor(Number(v) * 256 ** (bytes - Number(n))),
					dmxTo: 256 ** bytes - 1,
					physicalFrom: Number(cf.getAttribute("PhysicalFrom") ?? 0),
					physicalTo: Number(cf.getAttribute("PhysicalTo") ?? 1),
				};
			})
			.sort((a, b) => a.dmxFrom - b.dmxFrom);

		fs.forEach((f, i) => {
			if (i < fs.length - 1) f.dmxTo = fs[i + 1].dmxFrom - 1;
		});

		result.push(...fs);
	}

	return { count, functions: result };
}
