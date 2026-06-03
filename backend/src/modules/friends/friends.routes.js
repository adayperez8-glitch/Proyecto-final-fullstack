import { Router } from 'express'
import { asyncHandler } from '../../lib/asyncHandler.js'
import { authenticate } from '../../middleware/auth.js'
import { validate } from '../../middleware/validate.js'
import { addFriendSchema } from './friends.schema.js'
import * as ctrl from './friends.controller.js'

const router = Router()

router.get('/', authenticate, asyncHandler(ctrl.listFriends))
router.post('/', authenticate, validate(addFriendSchema), asyncHandler(ctrl.addFriend))
router.delete('/:friendId', authenticate, asyncHandler(ctrl.removeFriend))

export default router
