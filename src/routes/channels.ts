import { Router } from 'express';
import { 
  getChannels, 
  createChannel, 
  getChannelById 
} from '../controllers/channelController';
import { handleSlackCommand } from '../controllers/slackController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// TeamCollab 내부 API (인증 필요)
router.get('/', requireAuth, getChannels);
router.get('/:id', requireAuth, getChannelById);
router.post('/', requireAuth, createChannel);

// Slack 봇 웹훅 (인증 불필요 - 공개)
router.post('/slack', handleSlackCommand);

export default router;
