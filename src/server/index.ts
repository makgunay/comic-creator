import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { loadEnvironment, readConfig } from "./config";

loadEnvironment();
const config = readConfig();
const port = config.PORT;
const app = createApp();

if (process.env.NODE_ENV === "production") {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const dist = path.resolve(root, "../../dist");
  app.use(express.static(dist));
  app.get("*splat", (_request, response) => response.sendFile(path.join(dist, "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Comic Creator API listening on http://127.0.0.1:${port}`);
});
