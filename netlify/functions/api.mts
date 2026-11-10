import express from "express";
import serverless from "serverless-http";
import { withLambda } from "@netlify/aws-lambda-compat";
import type { Config } from "@netlify/functions";
import { registerApiRoutes } from "../../server/routes-netlify";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
registerApiRoutes(app);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ message: "Something went wrong" });
});

const handler = serverless(app);

export default withLambda(async (event, context) => (await handler(event as any, context as any)) as any);

export const config: Config = { path: "/api/*" };
