import type {
	DailyIdResponse,
	DirectionalMatch,
	GuessComparison,
	LimbusId,
	SkillComparison,
	VerifyGuessResponse,
} from "../types/limbus.types.js";

const DEFAULT_TIMEZONE = "Europe/Paris";

export class GameService {
	public getDailyId(idsData: LimbusId[]): DailyIdResponse {
		if (idsData.length === 0) {
			throw new Error("No IDs available");
		}

		const nowLocal = new Date();
		const parisTimeString = nowLocal.toLocaleString("en-US", { timeZone: DEFAULT_TIMEZONE });
		const nowParis = new Date(parisTimeString);
		const dateString = this.getDateString(nowParis);
		const hash = this.hashDateString(dateString);
		const targetIndex = Math.abs(hash) % idsData.length;
		const targetId = idsData[targetIndex];
		const tomorrowParis = new Date(nowParis.getFullYear(), nowParis.getMonth(), nowParis.getDate() + 1);
		const msUntilReset = tomorrowParis.getTime() - nowParis.getTime();

		return {
			id: targetId.id,
			date: `${nowParis.getFullYear()}-${nowParis.getMonth() + 1}-${nowParis.getDate()}`,
			timezone: DEFAULT_TIMEZONE,
			msUntilReset,
		};
	}

	public verifyGuess(idsData: LimbusId[], guessId: number, targetId: number): VerifyGuessResponse | null {
		const guessedId = idsData.find(id => id.id === guessId);
		const target = idsData.find(id => id.id === targetId);

		if (!guessedId || !target) {
			return null;
		}

		return {
			correct: guessId === targetId,
			guessedId,
			comparison: this.buildComparison(guessedId, target),
		};
	}

	private getDateString(date: Date): string {
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${date.getFullYear()}-${month}-${day}`;
	}

	private hashDateString(dateString: string): number {
		let hash = 0;
		for (let i = 0; i < dateString.length; i++) {
			const char = dateString.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash &= hash;
		}
		return hash;
	}

	private buildComparison(guessedId: LimbusId, target: LimbusId): GuessComparison {
		return {
			sinner: guessedId.sinner === target.sinner ? "YES" : "NO",
			rarity: guessedId.rarity === target.rarity ? "YES" : "NO",
			preciseKeywords: guessedId.preciseKeywords.map(keyword => ({
				keyword,
				match: target.preciseKeywords.includes(keyword) ? "YES" : "NO",
			})),
			statusKeywords: guessedId.statusKeywords.map(keyword => ({
				keyword,
				match: target.statusKeywords.includes(keyword) ? "YES" : "NO",
			})),
			season: guessedId.season === target.season ? "YES" : "NO",
			passiveCount: this.compareDirectional(
				guessedId.passiveCount.combat + guessedId.passiveCount.support,
				target.passiveCount.combat + target.passiveCount.support
			),
			skills: target.skills.map(targetSkill => {
				const guessedSkill = guessedId.skills.find(skill => skill.skillNumber === targetSkill.skillNumber);
				return this.compareSkill(targetSkill, guessedSkill);
			}),
		};
	}

	private compareDirectional(left: number, right: number): DirectionalMatch {
		if (left < right) {
			return "LESS";
		}

		if (left > right) {
			return "MORE";
		}

		return "YES";
	}

	private compareSkill(targetSkill: LimbusId["skills"][number], guessedSkill: LimbusId["skills"][number] | undefined): SkillComparison {
		if (!guessedSkill) {
			return {
				skillNumber: targetSkill.skillNumber,
				exists: "NO",
				variations: [],
			};
		}

		return {
			skillNumber: targetSkill.skillNumber,
			exists: "YES",
			variations: targetSkill.variations.map(targetVariation => {
				const guessedVariation = guessedSkill.variations.find(
					variation => variation.variationNumber === targetVariation.variationNumber
				);

				if (!guessedVariation) {
					return {
						variationNumber: targetVariation.variationNumber,
						sinAffinity: "NO",
						coinCount: "NO",
						finalPower: "LESS",
					};
				}

				return {
					variationNumber: targetVariation.variationNumber,
					sinAffinity: guessedVariation.sinAffinity === targetVariation.sinAffinity ? "YES" : "NO",
					coinCount: guessedVariation.coinCount === targetVariation.coinCount ? "YES" : "NO",
					finalPower: this.compareDirectional(guessedVariation.finalPower, targetVariation.finalPower),
				};
			}),
		};
	}
}
