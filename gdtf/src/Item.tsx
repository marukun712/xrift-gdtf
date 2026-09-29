import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
	Grabbable,
	type GrabbableTransform,
	TextInput,
	useInstanceEvent,
} from "@xrift/world-components";
import { useEffect, useRef, useState } from "react";
import {
	type Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Vector3,
} from "three";
import { SACN_DMX_EVENT } from "./gdtf/constants";
import { type DmxFunction, parseXML } from "./gdtf/parser";
import type { SacnDmxPacket } from "./gdtf/sacn";
import { createIndex, type Index } from "./gdtf/utils";
import { loadGlbFromUrl } from "./loadGlb";

export interface ItemProps {
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

interface BeamState {
	dimmer: number;
	cyan: number;
	magenta: number;
	yellow: number;
	shutterOpen: number;
}

function getBeamState(
	map: Map<string, BeamState>,
	geometry: string,
): BeamState {
	let state = map.get(geometry);
	if (!state) {
		state = { dimmer: 0, cyan: 0, magenta: 0, yellow: 0, shutterOpen: 1 };
		map.set(geometry, state);
	}
	return state;
}

export const Item: React.FC<ItemProps> = ({
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

	const beamStateRef = useRef(new Map<string, BeamState>());

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
				case "Dimmer":
					getBeamState(beamStateRef.current, f.geometry).dimmer = phys;
					break;
				case "ColorSub_C":
					getBeamState(beamStateRef.current, f.geometry).cyan = phys;
					break;
				case "ColorSub_M":
					getBeamState(beamStateRef.current, f.geometry).magenta = phys;
					break;
				case "ColorSub_Y":
					getBeamState(beamStateRef.current, f.geometry).yellow = phys;
					break;
				case "Shutter1":
					getBeamState(beamStateRef.current, f.geometry).shutterOpen = phys;
					break;
			}
		}

		for (const [geometry, state] of beamStateRef.current) {
			const beamNode = index.beam.get(geometry);
			if (!(beamNode instanceof Mesh)) continue;
			if (!(beamNode.material instanceof MeshStandardMaterial)) continue;

			const brightness = state.dimmer * state.shutterOpen;
			beamNode.material.transparent = true;
			beamNode.material.opacity = brightness;
			beamNode.material.color.setRGB(
				1 - state.cyan,
				1 - state.magenta,
				1 - state.yellow,
			);
			beamNode.material.emissive.copy(beamNode.material.color);
			beamNode.material.emissiveIntensity = brightness;
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
				id={crypto.randomUUID()}
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
					id={crypto.randomUUID()}
					transform={modelTransform}
					onMove={(next) => setModelTransform((prev) => ({ ...prev, ...next }))}
				>
					<primitive object={model} />
				</Grabbable>
			) : null}
		</group>
	);
};
