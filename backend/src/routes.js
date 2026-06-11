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
import statsRoutes from './modules/stats/stats.routes.js'
import { sseHandler } from './lib/events.js'

// Agregador de todas las rutas de la API. Se monta bajo /api en app.js.
const api = Router()

// Tiempo real (SSE). El token va por query (?token=) porque EventSource no
// permite cabeceras; lo valida el propio handler.
api.get('/events', sseHandler)

api.use('/auth', authRoutes)
api.use('/users', usersRoutes)
api.use('/sessions', sessionsRoutes)
api.use('/moods', moodsRoutes)
api.use('/stories', storiesRoutes)
api.use('/reactions', reactionsRoutes)
api.use('/comments', commentsRoutes)
api.use('/messages', messagesRoutes)
api.use('/friends', friendsRoutes)
api.use('/stats', statsRoutes)

export default api
