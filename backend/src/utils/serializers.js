// Serializadores: forma de los datos que la API expone al cliente.
// Centralizar aquí evita repetir mapeos por los controladores (DRY) y
// garantiza que nunca se filtren campos sensibles (passwordHash, etc.).

export const publicUser = (u) =>
  u && {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    role: u.role,
  }

// Versión para el propio usuario autenticado (incluye su email).
export const privateUser = (u) =>
  u && {
    ...publicUser(u),
    email: u.email,
    lastSeenAt: u.lastSeenAt,
    createdAt: u.createdAt,
  }

export const reactionDTO = (r) =>
  r && {
    id: r.id,
    emoji: r.emoji,
    text: r.text,
    createdAt: r.createdAt,
    from: publicUser(r.from),
  }

export const commentDTO = (c) =>
  c && {
    id: c.id,
    text: c.text,
    createdAt: c.createdAt,
    from: publicUser(c.from),
  }

export const moodDTO = (m) =>
  m && {
    id: m.id,
    mood: m.mood,
    note: m.note,
    date: m.date,
    createdAt: m.createdAt,
    user: m.user ? publicUser(m.user) : undefined,
    reactions: m.reactions ? m.reactions.map(reactionDTO) : undefined,
  }

export const sessionDTO = (s) =>
  s && {
    id: s.id,
    type: s.type,
    goalMinutes: s.goalMinutes,
    startedAt: s.startedAt,
    endsAt: s.endsAt,
    status: s.status,
    completedAt: s.completedAt,
    user: s.user ? publicUser(s.user) : undefined,
    comments: s.comments ? s.comments.map(commentDTO) : undefined,
  }

export const storyDTO = (s) =>
  s && {
    id: s.id,
    imageUrl: s.imageUrl,
    text: s.text,
    bgColor: s.bgColor,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    user: s.user ? publicUser(s.user) : undefined,
    messages: s.messages ? s.messages.map(messageDTO) : undefined,
  }

export const messageDTO = (m) =>
  m && {
    id: m.id,
    text: m.text,
    visibility: m.visibility,
    storyId: m.storyId,
    readAt: m.readAt,
    createdAt: m.createdAt,
    from: publicUser(m.from),
    to: publicUser(m.to),
  }
