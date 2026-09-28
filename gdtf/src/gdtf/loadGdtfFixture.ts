import type { Entry, FileEntry } from "@zip.js/zip.js";
import { BlobReader, BlobWriter, TextWriter, ZipReader } from "@zip.js/zip.js";
import { Group, type Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { convertGdtfMatrixToThree } from "./matrix";
import { type GdtfGeometryNode, parseGdtf } from "./parseGdtf";

// GDTF仕様: 3Dモデルファイルはmodels/配下のサブフォルダに格納される。
// gltf/gltf_high/gltf_lowはいずれもglb(バイナリ)形式で格納される。
const MODEL_FOLDER_CANDIDATES = [
	"models/gltf/",
	"models/gltf_high/",
	"models/gltf_low/",
];

function isFileEntry(entry: Entry): entry is FileEntry {
	return !entry.directory;
}

export async function loadGdtfFixtureFromZipUrl(url: string): Promise<Group> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`エラー ${response.status}`);
	}
	const zipBlob = await response.blob();
	const zipReader = new ZipReader(new BlobReader(zipBlob));
	const entries = (await zipReader.getEntries()).filter(isFileEntry);

	const descriptionEntry = entries.find(
		(entry) => entry.filename === "description.xml",
	);
	if (!descriptionEntry) {
		await zipReader.close();
		throw new Error("ファイルが不正です");
	}
	const descriptionXml = await descriptionEntry.getData<string>(
		new TextWriter(),
	);
	const fixture = parseGdtf(descriptionXml);
	const entryByPath = new Map(entries.map((entry) => [entry.filename, entry]));
	await zipReader.close();

	const loader = new GLTFLoader();
	const modelSceneByName = new Map<string, Group | null>();

	async function loadModelScene(modelName: string): Promise<Group | null> {
		const cached = modelSceneByName.get(modelName);
		if (cached !== undefined) return cached;

		const model = fixture.models.get(modelName);
		if (!model?.file) {
			modelSceneByName.set(modelName, null);
			return null;
		}

		let glbEntry: FileEntry | undefined;
		for (const folder of MODEL_FOLDER_CANDIDATES) {
			glbEntry = entryByPath.get(`${folder}${model.file}.glb`);
			if (glbEntry) break;
		}
		if (!glbEntry) {
			modelSceneByName.set(modelName, null);
			return null;
		}

		const blob = await glbEntry.getData<Blob>(new BlobWriter());
		const arrayBuffer = await blob.arrayBuffer();

		const scene = await new Promise<Group>((resolve, reject) => {
			loader.parse(
				arrayBuffer,
				"",
				(gltf) => resolve(gltf.scene),
				(error) => reject(error),
			);
		});
		modelSceneByName.set(modelName, scene);
		return scene;
	}

	// nodeのモデル・子要素をgroupに追加する。GeometryReferenceの解決時は
	// 参照先(target)の中身をこの関数で追加しつつ、位置は参照元自身のものを使う。
	async function populateGroup(
		node: GdtfGeometryNode,
		group: Object3D,
	): Promise<void> {
		if (node.modelName) {
			const modelScene = await loadModelScene(node.modelName);
			if (modelScene) {
				group.add(modelScene.clone());
			}
		}
		for (const child of node.children) {
			group.add(await buildNode(child));
		}
	}

	async function buildNode(node: GdtfGeometryNode): Promise<Object3D> {
		const group = new Group();
		group.name = node.name;
		group.matrixAutoUpdate = false;
		group.matrix.copy(convertGdtfMatrixToThree(node.position));

		if (node.referenceGeometryName) {
			const target = fixture.geometriesByName.get(node.referenceGeometryName);
			if (target) {
				await populateGroup(target, group);
			}
			return group;
		}

		await populateGroup(node, group);
		return group;
	}

	const fixtureGroup = new Group();
	for (const root of fixture.rootGeometries) {
		fixtureGroup.add(await buildNode(root));
	}
	return fixtureGroup;
}
