import express from 'express';
import { checkSetupStatus, runSetup, testConnection } from '../controllers/setupController.js';
const router = express.Router();
router.get('/status', checkSetupStatus);
router.post('/run', runSetup);
router.post('/test-connection', testConnection);
export default router;
