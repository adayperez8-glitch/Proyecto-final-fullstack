import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { createStorySchema } from './stories.schema.js'
import * as ctrl from './stories.controller.js'

const router = Router()

router.get('/feed', authenticate, asyncHandler(ctrl.feed))
router.post('/', authenticate, validate(createStorySchema), asyncHandler(ctrl.createStory))
router.get('/:id', authenticate, asyncHandler(ctrl.getOne))
router.delete('/:id', authenticate, asyncHandler(ctrl.remove))

export default router
