import type { Object3D, Quaternion } from "three";
import type { DmxFunction } from "./parser";

export type Index = {
	nodes: Map<string, Object3D>;
	baseQuat: Map<string, Quaternion>;
};

function find(root: Object3D, geometry: string): Object3D | null {
	let found: Object3D | null = null;
	root.traverse((obj) => {
		if (!found && obj.name.includes(geometry)) {
			found = obj;
		}
	});
	return found;
}

export function createIndex(root: Object3D, functions: DmxFunction[]) {
	const nodes = new Map<string, Object3D>();
	const baseQuat = new Map<string, Quaternion>();

	for (const f of functions) {
		if (nodes.has(f.geometry)) continue;
		const node = find(root, f.geometry);
		if (!node) {
			continue;
		}
		nodes.set(f.geometry, node);
		baseQuat.set(f.geometry, node.quaternion.clone());
	}

	return { nodes, baseQuat };
}
