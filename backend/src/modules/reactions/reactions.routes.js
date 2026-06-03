import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { createReactionSchema } from './reactions.schema.js'
import * as ctrl from './reactions.controller.js'

const router = Router()

router.post('/', authenticate, validate(createReactionSchema), asyncHandler(ctrl.addReaction))
router.delete('/:id', authenticate, asyncHandler(ctrl.removeReaction))

export default router
