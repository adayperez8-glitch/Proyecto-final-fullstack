import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { createSessionSchema } from './sessions.schema.js'
import * as ctrl from './sessions.controller.js'

const router = Router()

// Rutas concretas antes que /:id para que no las capture el parámetro.
router.get('/feed', authenticate, asyncHandler(ctrl.feed))
router.get('/me', authenticate, asyncHandler(ctrl.myActive))
router.post('/', authenticate, validate(createSessionSchema), asyncHandler(ctrl.startSession))
router.get('/:id', authenticate, asyncHandler(ctrl.getOne))
router.patch('/:id/complete', authenticate, asyncHandler(ctrl.complete))
router.patch('/:id/cancel', authenticate, asyncHandler(ctrl.cancel))

export default router
