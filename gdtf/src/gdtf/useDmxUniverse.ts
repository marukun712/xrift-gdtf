import { useEffect, useRef } from "react";

export function useDmxUniverse(url: string) {
	const universeRef = useRef<Uint8Array | null>(null);

	useEffect(() => {
		universeRef.current = null;
		const ws = new WebSocket(url);
		ws.binaryType = "arraybuffer";
		ws.onmessage = (event) => {
			console.log(event);
			universeRef.current = new Uint8Array(event.data as ArrayBuffer);
		};

		return () => {
			ws.close();
		};
	}, [url]);

	return universeRef;
}
