/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { RigidBody } from "@react-three/rapier";
import {
	createDefaultTextInputImplementation,
	DevEnvironment,
	TextInputProvider,
} from "@xrift/world-components";
import { createRoot } from "react-dom/client";
import { Item } from "./Item";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
	<TextInputProvider value={createDefaultTextInputImplementation()}>
		<DevEnvironment>
			<ambientLight intensity={0.4} />
			<directionalLight position={[5, 5, 5]} intensity={1} castShadow />
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
	</TextInputProvider>,
);
