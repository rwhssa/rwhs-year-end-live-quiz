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
    } else {
      socket.disconnect();
    }
  });

  io.on("status-change", handleStatusChange);
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
}

async function handleStatusChange(
  socket: Socket,
  data: StatusChangeData,
): Promise<void> {
  const current_status = await prisma.quizStatus.findFirst();
  if (!current_status) return;

  // Round changed.
  if (data.round && data.round !== current_status.round) {
    await notifyQuestionResult(data.round);
  }

  await prisma.quizStatus.update({
    where: {
      id: 1,
    },
    data,
  });

  socket.broadcast.emit("quiz-status", data);
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
      const num_students = option.answered_by.length;
      score += num_students;
    }

    prisma.schoolClass.update({
      where: {
        id: schoolClass.id,
      },
      data: {
        score,
      },
    });
  }
}
