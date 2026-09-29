import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
	Grabbable,
	type GrabbableTransform,
	TextInput,
	useInstanceEvent,
} from "@xrift/world-components";
import { useEffect, useRef, useState } from "react";
import { type Group, MathUtils, Quaternion, Vector3 } from "three";
import { SACN_DMX_EVENT } from "./gdtf/constants";
import { type DmxFunction, parseXML } from "./gdtf/parser";
import type { SacnDmxPacket } from "./gdtf/sacn";
import { createIndex, type Index } from "./gdtf/utils";
import { loadGlbFromUrl } from "./loadGlb";

export interface ItemProps {
	id: string;
	position?: [number, number, number];
	scale?: number;
	universe?: number;
	address?: number;
	defaultUrls?: string;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Error: ${response.status}`);
	}
	return await response.text();
}

export const Item: React.FC<ItemProps> = ({
	id,
	position = [0, 0.75, 0],
	scale = 1,
	universe = 1,
	address = 1,
	defaultUrls = "https://files.maril.blue/MegaPointe.glb,https://files.maril.blue/description.xml",
}) => {
	const [model, setModel] = useState<Group | null>(null);
	const [index, setIndex] = useState<Index | null>(null);
	const [functions, setFunctions] = useState<DmxFunction[] | null>(null);
	const [modelTransform, setModelTransform] = useState<GrabbableTransform>({
		position: { x: 0, y: 0, z: 0 },
		rotation: { x: 0, y: 0, z: 0 },
	});

	const axisY = new Vector3(0, 1, 0);
	const axisX = new Vector3(1, 0, 0);
	const q = new Quaternion();

	const universeRef = useRef<number[] | null>(null);
	useInstanceEvent<SacnDmxPacket>(SACN_DMX_EVENT, (packet) => {
		if (packet.universe !== universe) return;
		universeRef.current = packet.data;
	});

	useFrame(() => {
		const universe = universeRef.current;
		if (!functions || !universe || !model || !index) return;

		for (const f of functions) {
			let v = 0;
			for (let i = 0; i < f.bytes; i++)
				v = v * 256 + universe[address + f.offset + i];
			if (v < f.dmxFrom || v > f.dmxTo) continue;

			const t = (v - f.dmxFrom) / Math.max(f.dmxTo - f.dmxFrom, 1);
			const phys = f.physicalFrom + t * (f.physicalTo - f.physicalFrom);

			const node = index.nodes.get(f.geometry);
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

	const handleSubmitUrls = async (value: string) => {
		const [glbUrl, xmlUrl] = value.split(",").map((v) => v.trim());
		const xml = await fetchText(xmlUrl);
		const parsed = parseXML(xml);
		setFunctions(parsed.functions);

		const model = await loadGlbFromUrl(glbUrl);
		setModel(model);
		setIndex(createIndex(model, parsed.functions));
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: hogepiyo
	useEffect(() => {
		(async () => {
			await handleSubmitUrls(defaultUrls);
		})();
	}, []);

	return (
		<group position={position} scale={scale}>
			<TextInput
				id={`${id}-urls`}
				value={defaultUrls}
				onSubmit={handleSubmitUrls}
				placeholder="glbのURL,xmlのURL"
				interactionText="クリックしてURLを入力"
			>
				<mesh position={[0, 1, 0]}>
					<boxGeometry args={[1.2, 0.4, 0.05]} />
					<meshStandardMaterial color="#333333" />
					<Text
						position={[0, 0, 0.03]}
						fontSize={0.08}
						maxWidth={1.1}
						color="#ffffff"
						anchorX="center"
						anchorY="middle"
					>
						GDTF読み込み君
					</Text>
				</mesh>
			</TextInput>

			{model ? (
				<Grabbable
					id={`${id}-model`}
					transform={modelTransform}
					onMove={(next) => setModelTransform((prev) => ({ ...prev, ...next }))}
				>
					<primitive object={model} />
				</Grabbable>
			) : null}
		</group>
	);
};
