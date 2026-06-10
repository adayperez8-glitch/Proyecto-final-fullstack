import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { sendMessageSchema } from './messages.schema.js'
import * as ctrl from './messages.controller.js'

const router = Router()
const writeLimit = rateLimit({ windowMs: 60_000, max: 30 })

router.post('/', authenticate, writeLimit, validate(sendMessageSchema), asyncHandler(ctrl.send))
router.get('/', authenticate, asyncHandler(ctrl.inbox))
router.get('/unread-count', authenticate, asyncHandler(ctrl.unreadCount))
router.patch('/:id/read', authenticate, asyncHandler(ctrl.markRead))

export default router
