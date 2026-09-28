import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cardwatchRouter from "./cardwatch";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cardwatchRouter);

export default router;
