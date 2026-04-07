import express from "express";
import cors from "cors";
import { requestLogger } from "./middleware/request-logger.js";
import { createDevRoutes } from "./routes/dev.routes.js";
import { createGameRoutes } from "./routes/game.routes.js";
import { createIdsRoutes } from "./routes/ids.routes.js";
import { IdDataService } from "./services/id-data.service.js";
import { GameService } from "./services/game.service.js";

const app = express();
const idDataService = new IdDataService();
const gameService = new GameService();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api", createIdsRoutes(idDataService));
app.use("/api", createGameRoutes(idDataService, gameService));
app.use(createDevRoutes());

app.listen(4000, () => {
	console.log("Listening on port 4000. Try these URL:s");
	console.log("http://localhost:4000/ping");
	console.log("http://localhost:4000/attach-to-debugger");
});

export { };
