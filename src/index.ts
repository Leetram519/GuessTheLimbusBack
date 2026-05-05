import Express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { IDs } from "./data/ids.js";

// ***************************************************
// * Setup paths for ES modules
// ***************************************************

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ***************************************************
// * Load ID data from JSON file
// ***************************************************

interface SkillVariation {
	variationNumber: number;
	sinAffinity: string;
	coinCount: number;
	finalPower: number;
}

interface Skill {
	skillNumber: number;
	variations: SkillVariation[];
}

interface PassiveCount {
	combat: number;
	support: number;
}

interface LimbusId {
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

interface GuessComparison {
	sinner: "YES" | "NO";
	rarity: "YES" | "NO";
	preciseKeywords: { keyword: string; match: "YES" | "NO" }[];
	statusKeywords: { keyword: string; match: "YES" | "NO" }[];
	season: "YES" | "NO";
	passiveCount: "LESS" | "YES" | "MORE";
	skills: {
		skillNumber: number;
		exists: "YES" | "NO";
		variations: {
			variationNumber: number;
			sinAffinity: "YES" | "NO";
			coinCount: "YES" | "NO";
			finalPower: "LESS" | "YES" | "MORE";
		}[];
	}[];
}

function validateIdsDataset(ids: LimbusId[]): string[] {
	const issues: string[] = [];

	if (!Array.isArray(ids) || ids.length === 0) {
		issues.push("IDs dataset is empty or not an array.");
		return issues;
	}

	const idNumbers = new Set<number>();

	for (const id of ids) {
		if (!Number.isInteger(id.id)) {
			issues.push(`ID entry has invalid id value: ${String(id.id)}`);
			continue;
		}

		if (idNumbers.has(id.id)) {
			issues.push(`Duplicate ID value detected: ${id.id}`);
		}
		idNumbers.add(id.id);

		if (!id.name || typeof id.name !== "string") {
			issues.push(`ID ${id.id} has invalid name.`);
		}

		if (!Array.isArray(id.skills) || id.skills.length === 0) {
			issues.push(`ID ${id.id} has no skills.`);
			continue;
		}

		const skillNumbers = new Set<number>();
		for (const skill of id.skills) {
			if (!Number.isInteger(skill.skillNumber) || skill.skillNumber < 1) {
				issues.push(`ID ${id.id} has invalid skillNumber: ${String(skill.skillNumber)}`);
				continue;
			}

			if (skillNumbers.has(skill.skillNumber)) {
				issues.push(`ID ${id.id} has duplicate skillNumber ${skill.skillNumber}.`);
			}
			skillNumbers.add(skill.skillNumber);

			if (!Array.isArray(skill.variations) || skill.variations.length === 0) {
				issues.push(`ID ${id.id} skill ${skill.skillNumber} has no variations.`);
				continue;
			}

			const variationNumbers = new Set<number>();
			for (const variation of skill.variations) {
				if (!Number.isInteger(variation.variationNumber) || variation.variationNumber < 1) {
					issues.push(
						`ID ${id.id} skill ${skill.skillNumber} has invalid variationNumber: ${String(variation.variationNumber)}`
					);
					continue;
				}

				if (variationNumbers.has(variation.variationNumber)) {
					issues.push(
						`ID ${id.id} skill ${skill.skillNumber} has duplicate variationNumber ${variation.variationNumber}.`
					);
				}
				variationNumbers.add(variation.variationNumber);
			}
		}
	}

	return issues;
}

let idsData: LimbusId[] = [];

try {
	const validationIssues = validateIdsDataset(IDs as LimbusId[]);
	if (validationIssues.length > 0) {
		console.error("ID dataset validation failed. Sample issues:");
		for (const issue of validationIssues.slice(0, 25)) {
			console.error(` - ${issue}`);
		}
		throw new Error(`Invalid IDs dataset: ${validationIssues.length} issue(s) found.`);
	}

	idsData = IDs;
}
 catch (error) {
	console.error("Error loading IDs data:", error);
	idsData = [];
}

// ***************************************************
// * Use global variables (see global.d.ts file for definitions)
// ***************************************************

global.Config = { Foo: "Bar" };
global.Foo = "Bar";

// ***************************************************
// * Setup express
// ***************************************************

// eslint-disable-next-line new-cap
const app = Express();

// Enable CORS for frontend communication
app.use(cors());
app.use(Express.json());

// ***************************************************
// * API Routes for Limbus IDs
// ***************************************************

// Get all IDs
app.get("/api/ids", function (req: Express.Request, res: Express.Response) {
	console.log(`${new Date().toISOString()}: GET /api/ids`);
	res.json(idsData);
});

// Get today's target ID (based on date in Europe/Paris timezone)
app.get("/api/daily-id", function (req: Express.Request, res: Express.Response) {
	console.log(`${new Date().toISOString()}: GET /api/daily-id`);

	if (!idsData.length) {
		res.status(503).json({ error: "ID data is unavailable" });
		return;
	}

	// Get current date in Paris timezone
	const parisDate = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });
	const today = new Date(parisDate);

	// Create a date string for consistent hashing (YYYY-MM-DD)
	const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	// Hash-based pseudo-random selection for better distribution
	// This ensures the same ID is selected globally while distributing IDs evenly across days
	let hash = 0;
	for (let i = 0; i < dateString.length; i++) {
		const char = dateString.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	// Convert hash to positive and map to available IDs
	const targetIndex = Math.abs(hash) % idsData.length;
	const targetId = idsData[targetIndex];

	// Calculate time until next reset in Paris timezone
	const tomorrowParis = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
	const nowParis = new Date();
	const msUntilReset = tomorrowParis.getTime() - nowParis.getTime();

	res.json({
		id: targetId.id,
		date: `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`,
		timezone: 'Europe/Paris',
		msUntilReset: msUntilReset
	});
});

// Verify a guess
app.post("/api/verify-guess", function (req: Express.Request, res: Express.Response) {
	console.log(`${new Date().toISOString()}: POST /api/verify-guess`);

	if (!idsData.length) {
		res.status(503).json({ error: "ID data is unavailable" });
		return;
	}

	const { guessId, targetId } = req.body;

	if (!Number.isInteger(guessId) || !Number.isInteger(targetId)) {
		res.status(400).json({ error: "Invalid request" });
		return;
	}

	const isCorrect = guessId === targetId;
	const guessedId = idsData.find(id => id.id === guessId);
	const target = idsData.find(id => id.id === targetId);

	if (!guessedId || !target) {
		res.status(404).json({ error: "ID not found" });
		return;
	}

	// Generate comparison data
	const guessedPassiveTotal = guessedId.passiveCount.combat + guessedId.passiveCount.support;
	const targetPassiveTotal = target.passiveCount.combat + target.passiveCount.support;

	const comparison: GuessComparison = {
		sinner: guessedId.sinner === target.sinner ? "YES" : "NO",
		rarity: guessedId.rarity === target.rarity ? "YES" : "NO",
		preciseKeywords: guessedId.preciseKeywords.map(keyword => ({
			keyword,
			match: target.preciseKeywords.includes(keyword) ? "YES" : "NO"
		})),
		statusKeywords: guessedId.statusKeywords.map(keyword => ({
			keyword,
			match: target.statusKeywords.includes(keyword) ? "YES" : "NO"
		})),
		season: guessedId.season === target.season ? "YES" : "NO",
		passiveCount:
			guessedPassiveTotal < targetPassiveTotal
				? "LESS"
				: guessedPassiveTotal > targetPassiveTotal
				? "MORE"
				: "YES",
		skills: target.skills.map(targetSkill => {
			const guessedSkill = guessedId.skills.find(s => s.skillNumber === targetSkill.skillNumber);

			if (!guessedSkill) {
				return {
					skillNumber: targetSkill.skillNumber,
					exists: "NO" as const,
					variations: []
				};
			}

			return {
				skillNumber: targetSkill.skillNumber,
				exists: "YES" as const,
				variations: targetSkill.variations.map(targetVar => {
					const guessedVar = guessedSkill.variations.find(v => v.variationNumber === targetVar.variationNumber);

					if (!guessedVar) {
						return {
							variationNumber: targetVar.variationNumber,
							sinAffinity: "NO" as const,
							coinCount: "NO" as const,
							finalPower: "LESS" as const
						};
					}

					return {
						variationNumber: targetVar.variationNumber,
						sinAffinity: guessedVar.sinAffinity === targetVar.sinAffinity ? "YES" : "NO",
						coinCount: guessedVar.coinCount === targetVar.coinCount ? "YES" : "NO",
						finalPower:
							guessedVar.finalPower < targetVar.finalPower
								? "LESS"
								: guessedVar.finalPower > targetVar.finalPower
								? "MORE"
								: "YES"
					};
				})
			};
		})
	};

	res.json({
		correct: isCorrect,
		guessedId: guessedId,
		comparison: comparison
	});
});

// ***************************************************
// * Original test routes
// ***************************************************

app.get("/ping", function (req: Express.Request, res: Express.Response) {

	console.log(`${new Date().toISOString()}: ${req.protocol}://${req.get("host")}${req.originalUrl}`);
	// req.UserID is available here because of the modification of the global namespace
	res.json({ Pong: new Date() });

});

app.get("/attach-to-debugger", function (req: Express.Request, res: Express.Response) {

	console.log("The debugger will auto attach here if run with for example `npm run tsc-watch`.");
	console.log("Just make sure the prompt where you started is configured to enable the debugger.");
	console.log("Easiest to do that is to start a new 'JavaScript Debug Terminal' in VS Code.");

	debugger; // Use debugger statement or F9 to set breakpoints

	console.log("Step to me by pressing F10");
	res.json({ DebuggingCompleted: new Date() });
});

// ***************************************************
// * Start listening on port 4000
// ***************************************************

app.listen(4000, () => {
	console.log("Listening on port 4000. Try these URL:s");
	console.log("http://localhost:4000/ping");
	console.log("http://localhost:4000/attach-to-debugger");
});

// ***************************************************
// * This is mandatory in all files
// ***************************************************

export { };
