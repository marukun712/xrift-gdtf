import type { Object3D, Quaternion } from "three";
import type { DmxFunction } from "./parser";

export type Index = {
	nodes: Map<string, Object3D>;
	baseQuat: Map<string, Quaternion>;
};

export function stripBlenderNameSuffix(name: string) {
	return name.replace(/\.\d+$/, "");
}

export function createIndex(root: Object3D, functions: DmxFunction[]) {
	const nodes = new Map<string, Object3D>();
	const baseQuat = new Map<string, Quaternion>();

	for (const f of functions) {
		if (nodes.has(f.geometry)) continue;
		const node = root.getObjectByName(stripBlenderNameSuffix(f.geometry));
		if (!node) {
			console.warn("ノードが見つからない:", f.geometry);
			continue;
		}
		nodes.set(f.geometry, node);
		baseQuat.set(f.geometry, node.quaternion.clone());
	}

	return { nodes, baseQuat };
}
