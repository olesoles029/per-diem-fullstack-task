import express from "express";
import cors from "cors";
import { requestLogger } from "./requestLogger.js";
import locationsRouter from "./routes/locations.js";
import catalogRouter from "./routes/catalog.js";

const app = express();

app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? Number(value) : value
);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/locations", locationsRouter);
app.use("/api/catalog", catalogRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

export { app };
