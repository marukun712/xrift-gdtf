import { Text } from "@react-three/drei";
import { TextInput } from "@xrift/world-components";
import { useCallback, useRef, useState } from "react";
import type { Group } from "three";
import type { GdtfDmxProfile } from "./gdtf/parseGdtfDmx";
import { parseGdtfDmxProfile } from "./gdtf/parseGdtfDmx";
import { loadGlbFromUrl } from "./loadGlbFromUrl";

export interface ItemProps {
	position?: [number, number, number];
	scale?: number;
}

type Status =
	| { state: "idle" }
	| { state: "loading" }
	| { state: "loaded" }
	| { state: "error"; message: string };

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`エラー ${response.status}`);
	}
	return await response.text();
}

export const Item: React.FC<ItemProps> = ({
	position = [0, 0.75, 0],
	scale = 1,
}) => {
	const [glbStatus, setGlbStatus] = useState<Status>({ state: "idle" });
	const [model, setModel] = useState<Group | null>(null);
	const glbRequestIdRef = useRef(0);

	const [xmlStatus, setXmlStatus] = useState<Status>({ state: "idle" });
	const [dmxProfile, setDmxProfile] = useState<GdtfDmxProfile | null>(null);
	const xmlRequestIdRef = useRef(0);

	const handleSubmitGlb = useCallback((url: string) => {
		const requestId = ++glbRequestIdRef.current;
		setGlbStatus({ state: "loading" });
		setModel(null);

		loadGlbFromUrl(url)
			.then((scene) => {
				if (glbRequestIdRef.current !== requestId) return;
				setModel(scene);
				setGlbStatus({ state: "loaded" });
			})
			.catch((error: unknown) => {
				if (glbRequestIdRef.current !== requestId) return;
				const message = error instanceof Error ? error.message : "エラー";
				setGlbStatus({ state: "error", message });
			});
	}, []);

	const handleSubmitXml = useCallback((url: string) => {
		const requestId = ++xmlRequestIdRef.current;
		setXmlStatus({ state: "loading" });
		setDmxProfile(null);

		fetchText(url)
			.then((xmlText) => parseGdtfDmxProfile(xmlText))
			.then((profile) => {
				if (xmlRequestIdRef.current !== requestId) return;
				setDmxProfile(profile);
				setXmlStatus({ state: "loaded" });
			})
			.catch((error: unknown) => {
				if (xmlRequestIdRef.current !== requestId) return;
				const message = error instanceof Error ? error.message : "エラー";
				setXmlStatus({ state: "error", message });
			});
	}, []);

	const glbStatusText =
		glbStatus.state === "idle"
			? "glbのURLを入力"
			: glbStatus.state === "loading"
				? "読み込み中..."
				: glbStatus.state === "loaded"
					? "完了"
					: glbStatus.message;

	const xmlStatusText =
		xmlStatus.state === "idle"
			? "xmlのURLを入力"
			: xmlStatus.state === "loading"
				? "読み込み中..."
				: xmlStatus.state === "loaded"
					? `完了 (${dmxProfile?.channels.length ?? 0}ch)`
					: xmlStatus.message;

	return (
		<group position={position} scale={scale}>
			<TextInput
				id="gdtf-glb-url"
				onSubmit={handleSubmitGlb}
				placeholder="glbファイルのURL"
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
				{glbStatusText}
			</Text>

			<TextInput
				id="gdtf-xml-url"
				onSubmit={handleSubmitXml}
				placeholder="description.xmlのURL"
				interactionText="クリックしてURLを入力"
			>
				<mesh position={[0, 1.3, 0]}>
					<boxGeometry args={[1.2, 0.4, 0.05]} />
					<meshStandardMaterial color="#333333" />
				</mesh>
			</TextInput>

			<Text
				position={[0, 1.3, 0.03]}
				fontSize={0.08}
				maxWidth={1.1}
				color="#ffffff"
				anchorX="center"
				anchorY="middle"
			>
				{xmlStatusText}
			</Text>

			{model ? <primitive object={model} /> : null}
		</group>
	);
};
