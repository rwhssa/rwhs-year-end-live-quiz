import { PrismaClient } from "@prisma/client";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import createQuestion from "./endpoints/create_question";
import getQuestion from "./endpoints/get_question";
import updateSettings from "./endpoints/update_settings";
import createStudentAccount from "./endpoints/create_account";
import configureSocket from "./socket";
import listQuestions from "./endpoints/list_questions";
import submitAnswer from "./endpoints/submit_answer";
import cors from "cors";

const app = express();
export const prisma = new PrismaClient();
const port = 3000;

const server = createServer(app);
export const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const requestLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
};

async function main() {
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  configureEndpoints();
  configureSocket();

  server.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });
}

function configureEndpoints() {
  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  app.patch("/api/settings", updateSettings);

  app.post("/api/question", createQuestion);
  app.get("/api/question", listQuestions);
  app.get("/api/question/:id", getQuestion);
  app.post("/api/question/:id/answer", submitAnswer);

  app.post("/api/account", createStudentAccount);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

export const JWT_SECRET = "RWSA";
