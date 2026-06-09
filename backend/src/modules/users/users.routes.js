import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { uploadStoryMedia } from '../../middleware/upload.js'
import { updateMeSchema, setRoleSchema } from './users.schema.js'
import * as ctrl from './users.controller.js'

const router = Router()

// Rutas concretas antes que /:username.
router.get('/', authenticate, asyncHandler(ctrl.list))
router.get('/online', authenticate, asyncHandler(ctrl.online))
router.get('/search', authenticate, asyncHandler(ctrl.search))
router.get('/recommendations', authenticate, asyncHandler(ctrl.recommendations))
router.patch('/me', authenticate, validate(updateMeSchema), asyncHandler(ctrl.updateMe))
router.post('/me/avatar', authenticate, uploadStoryMedia, asyncHandler(ctrl.uploadAvatar))
router.get('/:username', authenticate, asyncHandler(ctrl.profile))

// Solo administradores.
router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(ctrl.removeUser))
router.patch('/:id/role', authenticate, requireRole('ADMIN'), validate(setRoleSchema), asyncHandler(ctrl.setRole))

export default router
