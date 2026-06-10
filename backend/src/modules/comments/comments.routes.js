import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { createCommentSchema } from './comments.schema.js'
import * as ctrl from './comments.controller.js'

const router = Router()
const writeLimit = rateLimit({ windowMs: 60_000, max: 30 })

router.post('/', authenticate, writeLimit, validate(createCommentSchema), asyncHandler(ctrl.addComment))
router.delete('/:id', authenticate, asyncHandler(ctrl.removeComment))

export default router
