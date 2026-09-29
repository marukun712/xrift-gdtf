import { Receiver } from "sacn";

const SACN_PORT = 5568;
const WS_PORT = 5569;
const WS_TOPIC = "sacn";

const universes = process.argv.slice(2).map(Number);
if (
	universes.length === 0 ||
	universes.some((universe) => Number.isNaN(universe))
) {
	throw new Error("Usage: bun relay.ts <universe...>");
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

const receiver = new Receiver({
	universes,
	port: SACN_PORT,
});

receiver.on("packet", (packet) => {
	const data = packet.payloadAsBuffer;
	if (!data) return;

	server.publish(
		WS_TOPIC,
		JSON.stringify({ universe: packet.universe, data: Array.from(data) }),
	);
});

console.log(
	`Listening for sACN on udp://0.0.0.0:${SACN_PORT} (universes: ${universes.join(", ")})`,
);
