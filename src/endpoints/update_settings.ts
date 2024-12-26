import type { Request, Response } from "express";
import { prisma } from "..";

interface UpdateSettingsBody {
  round_time_interval?: number;
}

const updateSettings = async (req: Request, res: Response): Promise<void> => {
  const body: UpdateSettingsBody = req.body;

  prisma.quizSettings
    .update({
      where: {
        id: 1,
      },
      data: body,
    })
    .then(() => {
      res.status(200).send("Settings updated");
    })
    .catch((e) => {
      console.error(e);
    });
};

export default updateSettings;
