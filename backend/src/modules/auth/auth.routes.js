import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { validate } from '../../middleware/validate.js'
import { authenticate } from '../../middleware/auth.js'
import { registerSchema, loginSchema } from './auth.schema.js'
import { register, login, me } from './auth.controller.js'

const router = Router()

router.post('/register', validate(registerSchema), asyncHandler(register))
router.post('/login', validate(loginSchema), asyncHandler(login))
router.get('/me', authenticate, asyncHandler(me))

export default router
