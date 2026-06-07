import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//cors configrations
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5473",
    credentials: true,
  })
);

//other configrations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// for cookies
app.use(cookieParser());

//import router
import healthCheckRouter from "./routes/healthcheck.routes.js";

// routes
app.use("/api/v1/healthcheck", healthCheckRouter);

export default app;
