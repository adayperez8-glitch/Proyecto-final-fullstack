import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { sendRequestSchema } from './friends.schema.js'
import * as ctrl from './friends.controller.js'

const router = Router()
const writeLimit = rateLimit({ windowMs: 60_000, max: 20 })

router.get('/', authenticate, asyncHandler(ctrl.listFriends))

// Solicitudes de amistad (rutas concretas antes que /:friendId).
router.get('/requests', authenticate, asyncHandler(ctrl.listRequests))
router.post('/requests', authenticate, writeLimit, validate(sendRequestSchema), asyncHandler(ctrl.sendRequest))
router.patch('/requests/:id/accept', authenticate, asyncHandler(ctrl.acceptRequest))
router.delete('/requests/:id', authenticate, asyncHandler(ctrl.declineRequest))

router.delete('/:friendId', authenticate, asyncHandler(ctrl.removeFriend))

export default router
