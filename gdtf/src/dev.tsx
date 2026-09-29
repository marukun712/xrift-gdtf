/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { RigidBody } from "@react-three/rapier";
import {
	createDefaultInstanceEventImplementation,
	createDefaultTextInputImplementation,
	DevEnvironment,
	InstanceEventProvider,
	TextInputProvider,
} from "@xrift/world-components";
import { createRoot } from "react-dom/client";
import { Bridge } from "./Bridge";
import { Item } from "./Item";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
	<InstanceEventProvider value={createDefaultInstanceEventImplementation()}>
		<TextInputProvider value={createDefaultTextInputImplementation()}>
			<DevEnvironment>
				<ambientLight intensity={0.4} />
				<directionalLight position={[5, 5, 5]} intensity={1} castShadow />
				<Bridge />
				<Item />
				<RigidBody type="fixed" colliders="cuboid">
					<mesh
						receiveShadow
						rotation={[-Math.PI / 2, 0, 0]}
						position={[0, 0, 0]}
					>
						<planeGeometry args={[100, 100]} />
						<meshStandardMaterial color="#888888" />
					</mesh>
				</RigidBody>
			</DevEnvironment>
		</TextInputProvider>
	</InstanceEventProvider>,
);
