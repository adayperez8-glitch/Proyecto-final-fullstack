import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { setMoodSchema } from './moods.schema.js'
import * as ctrl from './moods.controller.js'

const router = Router()

router.post('/', authenticate, validate(setMoodSchema), asyncHandler(ctrl.setMood))
router.get('/me', authenticate, asyncHandler(ctrl.myMood))
router.get('/:id', authenticate, asyncHandler(ctrl.getOne))

export default router
