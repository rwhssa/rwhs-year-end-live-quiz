import type { Socket } from "socket.io";
import { io, JWT_SECRET, prisma } from ".";
import jwt from "jsonwebtoken";
import { AuthRole, type StudentTokenPayload } from "./auth";
import type { SchoolClass } from "@prisma/client";

export default function configureSocket() {
  io.on("connection", (socket) => {
    const role: AuthRole = socket.handshake.auth.role;

    if (role === AuthRole.Student) {
      handleStudentConnection(socket);
    } else if (role === AuthRole.Host) {
      handleHostConnection(socket);

      socket.on("status-change", handleStatusChange);
    } else {
      socket.disconnect();
    }
  });

  autoNotifyHostInfo();
}

interface HostInfo {
  num_students: number;
}

async function autoNotifyHostInfo() {
  setInterval(async () => {
    const num_students = io.sockets.adapter.rooms.get("student")?.size;
    const data: HostInfo = {
      num_students: num_students || 0,
    };
    io.to("host").emit("host-info", data);
  }, 3000);
}

async function handleStudentConnection(socket: Socket) {
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  try {
    const jwt_payload = jwt.verify(token, JWT_SECRET) as StudentTokenPayload;
    socket.data.student_id = jwt_payload.id;
    socket.join("student");
    notifyQuizStatus(socket);
  } catch (e) {
    socket.disconnect();
    return;
  }
}

async function handleHostConnection(socket: Socket) {
  socket.join("host");
  notifyQuizStatus(socket);
}

interface StatusChangeData {
  is_active?: boolean;
  round?: number;
  remaining_time?: number;
}

let countdownInterval: NodeJS.Timer | null = null;

async function startCountdown(initial_time: number, round: number) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const result = await prisma.quizStatus.update({
    where: { id: 1 },
    data: { remaining_time: initial_time },
  });
  io.emit("quiz-status", result);

  countdownInterval = setInterval(async () => {
    const status = await prisma.quizStatus.findFirst();
    if (!status || !status.is_active || status.remaining_time === null) {
      clearInterval(countdownInterval!);
      countdownInterval = null;
      return;
    }

    const new_time = status.remaining_time - 1;
    if (new_time <= 0) {
      const result = await prisma.quizStatus.update({
        where: { id: 1 },
        data: {
          remaining_time: 0,
        },
      });
      clearInterval(countdownInterval!);
      countdownInterval = null;
      io.emit("quiz-status", result);
      await notifyQuestionResult(round);
      return;
    }

    const result = await prisma.quizStatus.update({
      where: { id: 1 },
      data: { remaining_time: new_time },
    });
    io.emit("quiz-status", result);
  }, 1000);
}

async function handleStatusChange(
  data: StatusChangeData,
  callback: (response: { success: boolean }) => void
): Promise<void> {
  console.log("Status change:", data);
  const current_status = await prisma.quizStatus.findFirst();
  if (!current_status) return;

  console.log("Status change:", data);

  if (data.round) {
    const question = await prisma.question.findUnique({
      where: { id: data.round },
    });

    if (!question) {
      console.error(`Question with id ${data.round} not found`);
      return;
    }

    if (data.round !== current_status.round || !current_status.is_active) {
      // Stop existing countdown
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      // Start new round
      if (data.is_active && data.round !== undefined) {
        const settings = await prisma.quizSettings.findFirst({
          where: { id: 1 },
        });
        if (!settings) return;

        const initial_time = settings.round_time_interval;
        data.remaining_time = initial_time;
      }

      if (data.is_active && data.remaining_time) {
        // TODO
        startCountdown(data.remaining_time, data.round);
      }
    }
  }

  try {
    const updated_status = await prisma.quizStatus.update({
      where: {
        id: 1,
      },
      data: {
        is_active: data.is_active,
        round: data.round,
        remaining_time: data.remaining_time,
      },
    });

    io.emit("quiz-status", updated_status);
    io.to("host").emit("quiz-status", updated_status);
    console.log("Quiz status updated:", updated_status);
  } catch (error) {
    console.error("Failed to update quiz status:", error);
  }

  callback({ success: true });
}

async function notifyQuizStatus(socket: Socket) {
  const quiz_status = await prisma.quizStatus.findFirst();
  socket.emit("quiz-status", quiz_status);
}

interface QuestionResult {
  round: number;
  option_percentages: {
    [option_id: string]: number; // Percentage of students who chose this option (0.00 - 1.00)
  };
  top_3_classes: SchoolClass[]; // Top 3 classes in all round
  // top_students: Student[]; // Top 3 students in all rounds
}

async function notifyQuestionResult(round: number) {
  const question = await prisma.question.findFirst({
    where: {
      id: round,
    },
    include: {
      options: {
        include: {
          answered_by: true,
        },
      },
    },
  });
  if (!question) return;

  const total_num_students = io.sockets.adapter.rooms.get("student")?.size;
  if (!total_num_students) {
    console.warn("No students connected");
    return;
  }

  const option_percentages: { [option_id: string]: number } = {};
  for (const option of question.options) {
    const num_students = option.answered_by.length;
    const percentage = num_students / total_num_students;
    option_percentages[option.id] = percentage;
  }

  await calculateScore(round);
  const top_3_classes = await prisma.schoolClass.findMany({
    take: 3,
    orderBy: {
      score: "desc",
    },
  });

  const data: QuestionResult = {
    round,
    option_percentages,
    top_3_classes,
  };

  io.emit("question-result", data);
}

async function calculateScore(question_id: number) {
  const question = await prisma.question.findFirst({
    where: {
      id: question_id,
    },
    include: {
      options: {
        include: {
          answered_by: true,
        },
      },
    },
  });
  if (!question) {
    console.error("Question not found");
    return;
  }

  // Calculate score for each class
  const classes = await prisma.schoolClass.findMany();
  for (const schoolClass of classes) {
    let score = schoolClass.score;
    for (const option of question.options) {
      if (!option.is_correct) continue;
      const num_students = option.answered_by.length * 10;
      score += num_students;
    }

    await prisma.schoolClass.update({
      where: {
        id: schoolClass.id,
      },
      data: {
        score,
      },
    });
  }
}
