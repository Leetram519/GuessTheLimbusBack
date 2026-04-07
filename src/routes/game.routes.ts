import { Router as createRouter, type Router } from "express";
import type { IdDataService } from "../services/id-data.service.js";
import type { GameService } from "../services/game.service.js";

interface VerifyGuessRequestBody {
	guessId?: unknown;
	targetId?: unknown;
}

export function createGameRoutes(idDataService: IdDataService, gameService: GameService): Router {
	const router = createRouter();

	router.get("/daily-id", (_req, res) => {
		try {
			const response = gameService.getDailyId(idDataService.getAllIds());
			res.json(response);
		}
		catch (error) {
			console.error("Error calculating daily ID:", error);
			res.status(500).json({ error: "Failed to calculate daily ID" });
		}
	});

	router.post("/verify-guess", (req, res) => {
		const body = req.body as VerifyGuessRequestBody;
		const guessId = body.guessId;
		const targetId = body.targetId;

		if (typeof guessId !== "number" || typeof targetId !== "number") {
			res.status(400).json({ error: "Invalid request" });
			return;
		}

		const result = gameService.verifyGuess(idDataService.getAllIds(), guessId, targetId);
		if (!result) {
			res.status(404).json({ error: "ID not found" });
			return;
		}

		res.json(result);
	});

	return router;
}
