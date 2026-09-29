import { Text } from "@react-three/drei";
import { TextInput, useInstanceEvent } from "@xrift/world-components";
import { useEffect, useState } from "react";
import { SACN_DMX_EVENT } from "./gdtf/constants";
import { parseSacnMessage } from "./gdtf/sacn";

const DEFAULT_RELAY_URL = "ws://localhost:5569";

export interface BridgeProps {
	position?: [number, number, number];
	scale?: number;
}

export const Bridge: React.FC<BridgeProps> = ({
	position = [0, 1, 0],
	scale = 1,
}) => {
	const [url, setUrl] = useState(DEFAULT_RELAY_URL);

	const emitSacnDmx = useInstanceEvent(SACN_DMX_EVENT, () => {});

	useEffect(() => {
		const ws = new WebSocket(url);

		ws.onmessage = (event) => {
			const packet = parseSacnMessage(event.data);
			if (!packet) return;
			emitSacnDmx(packet);
		};

		return () => {
			ws.close();
		};
	}, [url, emitSacnDmx]);

	return (
		<group position={position} scale={scale}>
			<TextInput
				id={crypto.randomUUID()}
				value={url}
				onSubmit={setUrl}
				placeholder="ws://localhost:7454"
				interactionText="クリックしてURLを入力"
			>
				<mesh>
					<boxGeometry args={[1.2, 0.4, 0.05]} />
					<meshStandardMaterial color="#333333" />
				</mesh>
				<Text
					position={[0, 0, 0.03]}
					fontSize={0.08}
					maxWidth={1.1}
					color="#ffffff"
					anchorX="center"
					anchorY="middle"
				>
					DMX-WSブリッジ
				</Text>
			</TextInput>
		</group>
	);
};
