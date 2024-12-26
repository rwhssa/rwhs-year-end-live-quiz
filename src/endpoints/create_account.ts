import type { Response, Request } from "express";
import { JWT_SECRET, prisma } from "..";
import jwt from "jsonwebtoken";
import type { StudentTokenPayload } from "../auth";

interface CreateStudentAccountBody {
  class_name: string;
  nickname?: string;
}

const createStudentAccount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body: CreateStudentAccountBody = req.body;

  if (!body.class_name) {
    res.status(400).send("Missing class_name");
  }

  const student = await prisma.student.create({
    data: {
      class: {
        connectOrCreate: {
          where: {
            name: body.class_name,
          },
          create: {
            name: body.class_name,
          },
        },
      },
      nickname: body.nickname,
    },
  });
  const payload: StudentTokenPayload = { id: student.id };

  const token = jwt.sign(payload, JWT_SECRET);
  res.status(201).json({ token });
};

export default createStudentAccount;
