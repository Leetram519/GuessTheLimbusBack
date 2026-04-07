import { Router as createRouter, type Router } from "express";

export function createDevRoutes(): Router {
	const router = createRouter();

	router.get("/ping", (req, res) => {
		console.log(`${new Date().toISOString()}: ${req.protocol}://${req.get("host")}${req.originalUrl}`);
		res.json({ Pong: new Date() });
	});

	router.get("/attach-to-debugger", (_req, res) => {
		console.log("The debugger will auto attach here if run with for example npm run tsc-watch.");
		console.log("Just make sure the prompt where you started is configured to enable the debugger.");
		console.log("Easiest to do that is to start a new JavaScript Debug Terminal in VS Code.");

		console.log("Step to me by pressing F10");
		res.json({ DebuggingCompleted: new Date() });
	});

	return router;
}
