import Express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

let idsData: LimbusId[] = [];

try {
	const dataPath = join(__dirname, "data", "ids.json");
	const jsonData = readFileSync(dataPath, "utf-8");
	idsData = JSON.parse(jsonData);
	console.log(`Loaded ${idsData.length} IDs from database`);
} catch (error) {
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

// Get today's target ID (based on date)
app.get("/api/daily-id", function (req: Express.Request, res: Express.Response) {
	console.log(`${new Date().toISOString()}: GET /api/daily-id`);
	
	const today = new Date();
	const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
	const targetIndex = dayOfYear % idsData.length;
	const targetId = idsData[targetIndex];
	
	res.json({
		id: targetId.id,
		date: today.toISOString().split("T")[0]
	});
});

// Verify a guess
app.post("/api/verify-guess", function (req: Express.Request, res: Express.Response) {
	console.log(`${new Date().toISOString()}: POST /api/verify-guess`);
	
	const { guessId, targetId } = req.body;
	
	if (typeof guessId !== "number" || typeof targetId !== "number") {
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
			guessedId.passiveCount.combat + guessedId.passiveCount.support <
			target.passiveCount.combat + target.passiveCount.support
				? "LESS"
				: guessedId.passiveCount.combat + guessedId.passiveCount.support >
				  target.passiveCount.combat + target.passiveCount.support
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
