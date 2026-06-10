import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import * as ctrl from './stats.controller.js'

const router = Router()

router.get('/me', authenticate, asyncHandler(ctrl.myStats))

export default router
