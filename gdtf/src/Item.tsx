import { Text } from "@react-three/drei";
import { TextInput } from "@xrift/world-components";
import { useCallback, useRef, useState } from "react";
import type { Group } from "three";
import { loadGdtfFixtureFromZipUrl } from "./gdtf/loadGdtfFixture";

export interface ItemProps {
	position?: [number, number, number];
	scale?: number;
}

type Status =
	| { state: "idle" }
	| { state: "loading" }
	| { state: "loaded"; url: string }
	| { state: "error"; message: string };

export const Item: React.FC<ItemProps> = ({
	position = [0, 0.75, 0],
	scale = 1,
}) => {
	const [status, setStatus] = useState<Status>({ state: "idle" });
	const [model, setModel] = useState<Group | null>(null);
	const requestIdRef = useRef(0);

	const handleSubmit = useCallback((url: string) => {
		const requestId = ++requestIdRef.current;
		setStatus({ state: "loading" });
		setModel(null);

		loadGdtfFixtureFromZipUrl(url)
			.then((scene) => {
				if (requestIdRef.current !== requestId) return;
				setModel(scene);
				setStatus({ state: "loaded", url });
			})
			.catch((error: unknown) => {
				if (requestIdRef.current !== requestId) return;
				const message = error instanceof Error ? error.message : "エラー";
				setStatus({ state: "error", message });
			});
	}, []);

	const statusText =
		status.state === "idle"
			? "URLを入力"
			: status.state === "loading"
				? "読み込み中..."
				: status.state === "loaded"
					? "完了"
					: status.message;

	return (
		<group position={position} scale={scale}>
			<TextInput
				id="gdtf-zip-url"
				onSubmit={handleSubmit}
				placeholder="GDTFファイルのURL"
				interactionText="クリックしてURLを入力"
			>
				<mesh position={[0, 0.75, 0]}>
					<boxGeometry args={[1.2, 0.4, 0.05]} />
					<meshStandardMaterial color="#333333" />
				</mesh>
			</TextInput>

			<Text
				position={[0, 0.75, 0.03]}
				fontSize={0.08}
				maxWidth={1.1}
				color="#ffffff"
				anchorX="center"
				anchorY="middle"
			>
				{statusText}
			</Text>

			{model ? <primitive object={model} /> : null}
		</group>
	);
};
