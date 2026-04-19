import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import researchRoutes from "./routes/research.js";
import sessionsRoutes from "./routes/sessions.js";
import { startKeepAlive } from "./keepalive.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*"}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.use("/api/research", researchRoutes);
app.use("/api/sessions", sessionsRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Node API on http://localhost:${port}`);
  startKeepAlive();
});