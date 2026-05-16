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

router.use(authenticateToken);

router.post('/', createLead);
router.get('/', getAllLeads);
router.get('/:id', getLeadById);
router.put('/:id', updateLead);
router.delete('/:id', authorizeRoles('Admin'), deleteLead);

export default router;
