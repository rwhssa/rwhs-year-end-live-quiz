import type { Request, Response } from "express";
import { prisma } from "..";

const getQuestion = async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id);

  prisma.question
    .findUnique({
      where: {
        id: id,
      },
      include: {
        options: true,
      },
    })
    .then((question) => {
      if (question) {
        res.json(question);
      } else {
        res.status(404).send("Question not found");
      }
    })
    .catch((e) => {
      console.error(e);
      res.status(500).send("Internal Server Error");
    });
};

export default getQuestion;
