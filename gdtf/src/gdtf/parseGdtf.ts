import type { Matrix4 } from "three";
import { parseGdtfMatrix } from "./matrix";

// GDTF仕様(gdtf.xsd)のGeometryChildrenグループに含まれる要素名。
// いずれもName/Model/Positionを持ち、子要素として再帰的にネストできる。
// 仕様: https://github.com/mvrdevelopment/spec/blob/master/build/gdtf.xsd
const GEOMETRY_TAG_NAMES = [
	"Geometry",
	"Axis",
	"FilterBeam",
	"FilterColor",
	"FilterGobo",
	"FilterShaper",
	"Beam",
	"MediaServerLayer",
	"MediaServerCamera",
	"MediaServerMaster",
	"Display",
	"Laser",
	"Magnet",
];

// GeometryReferenceおよびそれを拡張する要素。Geometry属性で他のGeometryを参照し、
// そのサブツリーをこの位置にインスタンスする。
const GEOMETRY_REFERENCE_TAG_NAMES = [
	"GeometryReference",
	"Structure",
	"Support",
	"Inventory",
];

export interface GdtfModel {
	name: string;
	file: string;
}

export interface GdtfGeometryNode {
	name: string;
	modelName: string | null;
	position: Matrix4;
	children: GdtfGeometryNode[];
	referenceGeometryName: string | null;
}

export interface GdtfFixture {
	models: Map<string, GdtfModel>;
	rootGeometries: GdtfGeometryNode[];
	geometriesByName: Map<string, GdtfGeometryNode>;
}

function isGeometryLikeElement(element: Element): boolean {
	return (
		GEOMETRY_TAG_NAMES.includes(element.tagName) ||
		GEOMETRY_REFERENCE_TAG_NAMES.includes(element.tagName)
	);
}

export function parseGdtf(xmlText: string): GdtfFixture {
	const doc = new DOMParser().parseFromString(xmlText, "application/xml");
	if (doc.querySelector("parsererror")) {
		throw new Error("description.xmlの解析に失敗しました");
	}

	const models = new Map<string, GdtfModel>();
	for (const modelElement of doc.querySelectorAll(
		"FixtureType > Models > Model",
	)) {
		const name = modelElement.getAttribute("Name");
		if (!name) continue;
		models.set(name, { name, file: modelElement.getAttribute("File") ?? "" });
	}

	const geometriesByName = new Map<string, GdtfGeometryNode>();

	function parseGeometryElement(element: Element): GdtfGeometryNode {
		const name = element.getAttribute("Name") ?? "";
		const isReference = GEOMETRY_REFERENCE_TAG_NAMES.includes(element.tagName);
		const node: GdtfGeometryNode = {
			name,
			modelName: element.getAttribute("Model"),
			position: parseGdtfMatrix(element.getAttribute("Position")),
			children: [],
			referenceGeometryName: isReference
				? element.getAttribute("Geometry")
				: null,
		};
		geometriesByName.set(name, node);

		if (!isReference) {
			for (const child of element.children) {
				if (isGeometryLikeElement(child)) {
					node.children.push(parseGeometryElement(child));
				}
			}
		}
		return node;
	}

	const rootGeometries: GdtfGeometryNode[] = [];
	const geometriesRoot = doc.querySelector("FixtureType > Geometries");
	if (geometriesRoot) {
		for (const child of geometriesRoot.children) {
			if (isGeometryLikeElement(child)) {
				rootGeometries.push(parseGeometryElement(child));
			}
		}
	}

	return { models, rootGeometries, geometriesByName };
}
