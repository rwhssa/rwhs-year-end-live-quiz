import type { Request, Response } from "express";
import { prisma } from "..";

interface CreateQuizBody {
  text: string;
  image_url?: string;
  options: QuestionOption[];
}

interface QuestionOption {
  text: string;
  image_url?: string;
  is_correct: boolean;
}

const createQuestion = async (req: Request, res: Response): Promise<void> => {
  const body: CreateQuizBody = req.body;

  prisma.question
    .create({
      data: {
        text: body.text,
        image_url: body.image_url,
        options: {
          create: body.options,
        },
      },
      include: {
        options: true,
      },
    })
    .then((question) => {
      res.status(201).json(question);
    })
    .catch((e) => {
      console.error(e);
      res.status(500).send("Internal Server Error");
    });
};

export default createQuestion;
