import express from 'express';
import {
  createAvailability,
  createService,
  deactivateService,
  getServiceById,
  getServiceSlots,
  getServices,
  updateService,
} from '../controllers/serviceController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getServices);
router.get('/:id', getServiceById);
router.get('/:serviceId/slots', getServiceSlots);
router.post('/', authenticateToken, requireAdmin, createService);
router.patch('/:id', authenticateToken, requireAdmin, updateService);
router.patch('/:id/deactivate', authenticateToken, requireAdmin, deactivateService);
router.post('/:id/slots', authenticateToken, requireAdmin, createAvailability);

export default router;
