import type { Group } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export async function loadGlbFromUrl(url: string): Promise<Group> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`エラー ${response.status}`);
	}
	const arrayBuffer = await response.arrayBuffer();

	const loader = new GLTFLoader();
	return await new Promise<Group>((resolve, reject) => {
		loader.parse(
			arrayBuffer,
			"",
			(gltf) => resolve(gltf.scene),
			(error) => reject(error),
		);
	});
}
