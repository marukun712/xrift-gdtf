const ARTNET_PORT = 6454;
const ARTNET_CONSOLE_HOST = "127.0.0.1";
const TARGET_UNIVERSE = 0;
const WS_PORT = 7454;
const WS_TOPIC = "artnet";

const ARTNET_ID = "Art-Net\0";
const OPCODE_ARTDMX = 0x5000;

function parseArtDmx(
	packet: Buffer,
): { universe: number; data: Buffer } | null {
	if (packet.length < 18) return null;
	if (packet.toString("latin1", 0, 8) !== ARTNET_ID) return null;
	if (packet.readUInt16LE(8) !== OPCODE_ARTDMX) return null;

	const universe = packet.readUInt16LE(14);
	const length = packet.readUInt16BE(16);
	return { universe, data: packet.subarray(18, 18 + length) };
}

const server = Bun.serve({
	port: WS_PORT,
	fetch(req, server) {
		if (server.upgrade(req)) return;
		return new Response("Upgrade failed", { status: 500 });
	},
	websocket: {
		open(ws) {
			ws.subscribe(WS_TOPIC);
		},
		message() {},
		close(ws) {
			ws.unsubscribe(WS_TOPIC);
		},
	},
});
console.log(`WebSocket relay listening on ws://localhost:${WS_PORT}`);

await Bun.udpSocket({
	hostname: "0.0.0.0",
	port: ARTNET_PORT,
	socket: {
		data(_socket, buffer, _port, address) {
			if (address !== ARTNET_CONSOLE_HOST) return;

			const packet = parseArtDmx(buffer);
			console.log(packet);
			if (!packet || packet.universe !== TARGET_UNIVERSE) return;

			server.publish(WS_TOPIC, packet.data);
		},
	},
});

console.log(
	`Listening for Art-Net on udp://${ARTNET_CONSOLE_HOST}:${ARTNET_PORT}`,
);
