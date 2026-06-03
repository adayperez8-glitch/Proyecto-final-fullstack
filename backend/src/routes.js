import { Router } from 'express'
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import sessionsRoutes from './modules/sessions/sessions.routes.js'
import moodsRoutes from './modules/moods/moods.routes.js'
import storiesRoutes from './modules/stories/stories.routes.js'
import reactionsRoutes from './modules/reactions/reactions.routes.js'
import commentsRoutes from './modules/comments/comments.routes.js'
import messagesRoutes from './modules/messages/messages.routes.js'
import friendsRoutes from './modules/friends/friends.routes.js'
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js'

// Agregador de todas las rutas de la API. Se monta bajo /api en app.js.
const api = Router()

api.use('/auth', authRoutes)
api.use('/users', usersRoutes)
api.use('/sessions', sessionsRoutes)
api.use('/moods', moodsRoutes)
api.use('/stories', storiesRoutes)
api.use('/reactions', reactionsRoutes)
api.use('/comments', commentsRoutes)
api.use('/messages', messagesRoutes)
api.use('/friends', friendsRoutes)
api.use('/maintenance', maintenanceRoutes)

export default api
