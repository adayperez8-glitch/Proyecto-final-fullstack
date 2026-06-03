import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { sendMessageSchema } from './messages.schema.js'
import * as ctrl from './messages.controller.js'

const router = Router()

router.post('/', authenticate, validate(sendMessageSchema), asyncHandler(ctrl.send))
router.get('/', authenticate, asyncHandler(ctrl.inbox))
router.patch('/:id/read', authenticate, asyncHandler(ctrl.markRead))

export default router
