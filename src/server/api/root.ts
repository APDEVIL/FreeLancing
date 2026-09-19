import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { userRouter }    from "./routers/user";
import { projectRouter } from "./routers/project";
import { taskRouter }    from "./routers/task";
import { paymentRouter } from "./routers/payment";
import { messageRouter } from "./routers/message";

export const appRouter = createTRPCRouter({
  user:    userRouter,
  project: projectRouter,
  task:    taskRouter,
  payment: paymentRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);