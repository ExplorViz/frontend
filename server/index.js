import express from "express";
import { diagramsRouter } from "./diagrams.js"; // note the .js extension in ESM

const app = express();

app.use(express.json());
app.use("/api/diagrams", diagramsRouter);

app.listen(9123, () => {
  console.log("kubediagrams API running on :9123");
});
