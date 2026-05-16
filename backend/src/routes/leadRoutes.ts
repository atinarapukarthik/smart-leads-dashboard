import { Router } from 'express';
import authenticateToken from '../middleware/auth';
import authorizeRoles from '../middleware/rbac';
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
} from '../controllers/leadController';

const router = Router();

router.use(authenticateToken as any);

router.post('/', createLead as any);
router.get('/', getAllLeads as any);
router.get('/:id', getLeadById as any);
router.put('/:id', updateLead as any);
router.delete('/:id', authorizeRoles('Admin') as any, deleteLead as any);

export default router;