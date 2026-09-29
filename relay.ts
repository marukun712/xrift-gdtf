const ARTNET_PORT = 6454;
const WS_PORT = 7454;
const WS_TOPIC = "artnet";

const ARTNET_CONSOLE_HOST = process.argv[2];
if (!ARTNET_CONSOLE_HOST) {
	throw new Error("Usage: bun relay.ts <host>");
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
	hostname: ARTNET_CONSOLE_HOST,
	port: ARTNET_PORT,
	socket: {
		data(_, buffer) {
			server.publish(WS_TOPIC, buffer);
		},
	},
});

console.log(
	`Listening for Art-Net on udp://${ARTNET_CONSOLE_HOST}:${ARTNET_PORT}`,
);
