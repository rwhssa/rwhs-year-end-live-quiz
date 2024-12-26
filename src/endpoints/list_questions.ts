import type { Request, Response } from "express";
import { prisma } from "..";

const listQuestions = async (req: Request, res: Response): Promise<void> => {
  const questions = await prisma.question.findMany({
    include: {
      options: true,
    },
  });
  res.status(200).json(questions);
};

export default listQuestions;
