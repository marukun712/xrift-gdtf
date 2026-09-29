const ARTNET_ID = "Art-Net\0";
const OPCODE_ARTDMX = 0x5000;

export interface ArtDmxPacket {
	net: number;
	subnet: number;
	universe: number;
	sequence: number;
	physical: number;
	data: number[];
}

export function parseArtDmx(packet: ArrayBuffer): ArtDmxPacket | null {
	if (packet.byteLength < 18) return null;

	const bytes = new Uint8Array(packet);
	const id = String.fromCharCode(...bytes.subarray(0, 8));
	if (id !== ARTNET_ID) return null;

	const view = new DataView(packet);
	if (view.getUint16(8, true) !== OPCODE_ARTDMX) return null;

	const sequence = view.getUint8(12);
	const physical = view.getUint8(13);
	const subUni = view.getUint8(14);
	const net = view.getUint8(15) & 0x7f;
	const length = view.getUint16(16, false);

	const subnet = (subUni >> 4) & 0x0f;
	const universe = subUni & 0x0f;

	const data = Array.from(bytes.subarray(18, 18 + length));

	return { net, subnet, universe, sequence, physical, data };
}
