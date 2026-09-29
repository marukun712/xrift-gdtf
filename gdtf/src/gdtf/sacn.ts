import { z } from "zod";

const sacnDmxPacketSchema = z.object({
	universe: z.number(),
	data: z.array(z.number()),
});

export type SacnDmxPacket = z.infer<typeof sacnDmxPacketSchema>;

export function parseSacnMessage(raw: string): SacnDmxPacket | null {
	const result = sacnDmxPacketSchema.safeParse(JSON.parse(raw));
	return result.success ? result.data : null;
}
