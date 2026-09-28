import type { Object3D } from "three";

export function stripBlenderNameSuffix(name: string): string {
	return name.replace(/\.\d+$/, "");
}

export function findNodeByGeometryName(
	root: Object3D,
	geometryName: string,
): Object3D | null {
	let found: Object3D | null = null;
	root.traverse((object) => {
		if (found) return;
		if (stripBlenderNameSuffix(object.name) === geometryName) {
			found = object;
		}
	});
	return found;
}
