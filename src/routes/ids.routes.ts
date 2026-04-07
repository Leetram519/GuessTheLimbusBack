import { Router as createRouter, type Router } from "express";
import type { IdDataService } from "../services/id-data.service.js";

export function createIdsRoutes(idDataService: IdDataService): Router {
	const router = createRouter();

	router.get("/ids", (_req, res) => {
		res.json(idDataService.getAllIds());
	});

	return router;
}
