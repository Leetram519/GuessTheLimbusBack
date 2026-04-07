import { IDs } from "../data/ids.js";
import type { LimbusId } from "../types/limbus.types.js";

export class IdDataService {
	private readonly ids: LimbusId[];

	public constructor() {
		this.ids = IDs as LimbusId[];
	}

	public getAllIds(): LimbusId[] {
		return this.ids;
	}

	public getIdById(id: number): LimbusId | undefined {
		return this.ids.find(item => item.id === id);
	}
}
