import type { Response, Request } from "express";
import { JWT_SECRET, prisma } from "..";
import type { StudentTokenPayload } from "../auth";
import jwt from "jsonwebtoken";

interface SubmitAnswerBody {
  correct_option_ids: number[];
}

const submitAnswer = async (req: Request, res: Response): Promise<void> => {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  const { id: student_id } = jwt.verify(
    token,
    JWT_SECRET
  ) as StudentTokenPayload;

  const id = parseInt(req.params.id);
  const body: SubmitAnswerBody = req.body;

  const question = await prisma.question.findFirst({
    where: {
      id,
    },
    include: {
      options: true,
    },
  });
  if (!question) {
    res.status(404).send("Question not found");
    return;
  }

  let transactions = [];
  for (const option of question.options) {
    if (!body.correct_option_ids.includes(option.id)) continue;

    transactions.push(
      prisma.option.update({
        where: {
          id: option.id,
        },
        data: {
          answered_by: {
            connect: {
              id: student_id,
            },
          },
        },
      })
    );
  }

  await prisma.$transaction(transactions);
};

function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer") return null;

  return token;
}

export default submitAnswer;
