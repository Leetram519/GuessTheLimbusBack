export interface SkillVariation {
	variationNumber: number;
	sinAffinity: string;
	coinCount: number;
	finalPower: number;
}

export interface Skill {
	skillNumber: number;
	variations: SkillVariation[];
}

export interface PassiveCount {
	combat: number;
	support: number;
}

export interface LimbusId {
	id: number;
	name: string;
	imagePath: string;
	sinner: string;
	rarity: number;
	preciseKeywords: string[];
	statusKeywords: string[];
	season: string;
	passiveCount: PassiveCount;
	skills: Skill[];
}

export type YesNo = "YES" | "NO";
export type DirectionalMatch = "LESS" | "YES" | "MORE";

export interface KeywordComparison {
	keyword: string;
	match: YesNo;
}

export interface SkillVariationComparison {
	variationNumber: number;
	sinAffinity: YesNo;
	coinCount: YesNo;
	finalPower: DirectionalMatch;
}

export interface SkillComparison {
	skillNumber: number;
	exists: YesNo;
	variations: SkillVariationComparison[];
}

export interface GuessComparison {
	sinner: YesNo;
	rarity: YesNo;
	preciseKeywords: KeywordComparison[];
	statusKeywords: KeywordComparison[];
	season: YesNo;
	passiveCount: DirectionalMatch;
	skills: SkillComparison[];
}

export interface DailyIdResponse {
	id: number;
	date: string;
	timezone: string;
	msUntilReset: number;
}

export interface VerifyGuessResponse {
	correct: boolean;
	guessedId: LimbusId;
	comparison: GuessComparison;
}
