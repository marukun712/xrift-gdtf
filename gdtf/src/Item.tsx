import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { TextInput } from "@xrift/world-components";
import { useCallback, useState } from "react";
import { type Group, MathUtils, Quaternion, Vector3 } from "three";
import { type DmxFunction, parseXML } from "./gdtf/parser";
import { useDmxUniverse } from "./gdtf/useDmxUniverse";
import { createIndex, type Index } from "./gdtf/utils";
import { loadGlbFromUrl } from "./loadGlb";

const DMX_RELAY_URL = "ws://localhost:7454";

export interface ItemProps {
	position?: [number, number, number];
	scale?: number;
	start?: number;
}

type Status =
	| { state: "idle" }
	| { state: "loading" }
	| { state: "loaded" }
	| { state: "error"; message: string };

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Error: ${response.status}`);
	}
	return await response.text();
}

export const Item: React.FC<ItemProps> = ({
	position = [0, 0.75, 0],
	scale = 1,
	start = 1,
}) => {
	const [glbStatus, setGlbStatus] = useState<Status>({ state: "idle" });
	const [xmlStatus, setXmlStatus] = useState<Status>({ state: "idle" });

	const [model, setModel] = useState<Group | null>(null);
	const [index, setIndex] = useState<Index | null>(null);
	const [functions, setFunctions] = useState<DmxFunction[] | null>(null);

	const axisY = new Vector3(0, 1, 0);
	const axisX = new Vector3(1, 0, 0);
	const q = new Quaternion();

	const universeRef = useDmxUniverse(DMX_RELAY_URL);
	useFrame(() => {
		const universe = universeRef.current;
		if (!functions || !universe || !model || !index) return;
		for (const f of functions) {
			let v = 0;
			for (let i = 0; i < f.bytes; i++)
				v = v * 256 + universe[start + f.offset + i];
			if (v < f.dmxFrom || v > f.dmxTo) continue;

			const t = (v - f.dmxFrom) / Math.max(f.dmxTo - f.dmxFrom, 1);
			const phys = f.physicalFrom + t * (f.physicalTo - f.physicalFrom);

			const node = index.nodes.get(f.attribute);
			const baseQuat = index.baseQuat.get(f.geometry);
			if (!node || !baseQuat) return;

			switch (f.attribute) {
				case "Pan":
					node.quaternion
						.copy(baseQuat)
						.multiply(q.setFromAxisAngle(axisY, MathUtils.degToRad(phys)));
					break;
				case "Tilt":
					node.quaternion
						.copy(baseQuat)
						.multiply(q.setFromAxisAngle(axisX, MathUtils.degToRad(phys)));
					break;
			}
		}
	});

	const handleSubmitGlb = useCallback(
		(url: string) => {
			setGlbStatus({ state: "loading" });
			setModel(null);

			loadGlbFromUrl(url)
				.then((scene) => {
					setModel(scene);
					if (functions) setIndex(createIndex(scene, functions));
					setGlbStatus({ state: "loaded" });
				})
				.catch((error: unknown) => {
					const message = error instanceof Error ? error.message : "Error";
					setGlbStatus({ state: "error", message });
				});
		},
		[functions],
	);

	const handleSubmitXml = useCallback((url: string) => {
		setXmlStatus({ state: "loading" });

		fetchText(url)
			.then((xmlText) => parseXML(xmlText))
			.then((data) => {
				console.log(data);
				setFunctions(data.functions);
				setXmlStatus({ state: "loaded" });
			})
			.catch((error: unknown) => {
				const message = error instanceof Error ? error.message : "Error";
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
					? "完了"
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
