import { Matrix4 } from "three";

export function parseGdtfMatrix(value: string | null | undefined): Matrix4 {
	const matrix = new Matrix4();
	if (!value) return matrix;

	const rows = [...value.matchAll(/\{([^}]*)\}/g)].map((match) =>
		match[1].split(",").map((token) => Number.parseFloat(token)),
	);
	if (
		rows.length !== 4 ||
		rows.some((row) => row.length !== 4 || row.some(Number.isNaN))
	) {
		return matrix;
	}

	matrix.set(
		rows[0][0],
		rows[0][1],
		rows[0][2],
		rows[0][3],
		rows[1][0],
		rows[1][1],
		rows[1][2],
		rows[1][3],
		rows[2][0],
		rows[2][1],
		rows[2][2],
		rows[2][3],
		rows[3][0],
		rows[3][1],
		rows[3][2],
		rows[3][3],
	);
	return matrix;
}

const ZUP_TO_YUP = new Matrix4().makeRotationX(-Math.PI / 2);
const YUP_TO_ZUP = new Matrix4().makeRotationX(Math.PI / 2);

export function convertGdtfMatrixToThree(matrix: Matrix4): Matrix4 {
	return ZUP_TO_YUP.clone().multiply(matrix).multiply(YUP_TO_ZUP);
}
