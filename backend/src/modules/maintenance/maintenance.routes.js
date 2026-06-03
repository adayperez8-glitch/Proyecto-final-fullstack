import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { requireApiKey } from '../../middleware/apiKey.js'
import { validate } from '../../middleware/validate.js'
import { coachReactionSchema } from './maintenance.schema.js'
import * as ctrl from './maintenance.controller.js'

// Endpoints internos para las automatizaciones de N8N. No usan JWT de usuario;
// se autentican con la cabecera x-api-key (INTERNAL_API_KEY).
const router = Router()

router.post('/stories/cleanup', requireApiKey, asyncHandler(ctrl.cleanupStories))
router.post(
  '/coach/reaction',
  requireApiKey,
  validate(coachReactionSchema),
  asyncHandler(ctrl.coachReaction),
)

export default router
