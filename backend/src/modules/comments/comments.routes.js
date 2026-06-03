import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { createCommentSchema } from './comments.schema.js'
import * as ctrl from './comments.controller.js'

const router = Router()

router.post('/', authenticate, validate(createCommentSchema), asyncHandler(ctrl.addComment))
router.delete('/:id', authenticate, asyncHandler(ctrl.removeComment))

export default router
