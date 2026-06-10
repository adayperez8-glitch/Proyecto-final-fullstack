import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { rateLimit } from '../../middleware/rateLimit.js'
import { setMoodSchema } from './moods.schema.js'
import * as ctrl from './moods.controller.js'

const router = Router()
const writeLimit = rateLimit({ windowMs: 60_000, max: 15 })

router.post('/', authenticate, writeLimit, validate(setMoodSchema), asyncHandler(ctrl.setMood))
router.get('/me', authenticate, asyncHandler(ctrl.myMood))
router.get('/:id', authenticate, asyncHandler(ctrl.getOne))

export default router
