import { Router, Request, Response } from 'express';
import authenticateToken from '../middleware/auth';
import authorizeRoles from '../middleware/rbac';
import { getSalesPerformance } from '../controllers/analyticsController';

const router = Router();

router.get('/sales-performance', authenticateToken, authorizeRoles('Admin'), (req: Request, res: Response) => getSalesPerformance(req, res));

export default router;