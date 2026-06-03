import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

// Integración externa: email transaccional.
// Si hay SMTP configurado se envía de verdad; si no (dev), se imprime por consola.
let transporter

function getTransporter() {
  if (transporter !== undefined) return transporter
  if (env.smtp.host && env.smtp.user) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  } else {
    transporter = null
  }
  return transporter
}

export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter()
  if (!t) {
    if (!env.isTest) {
      console.log(`\n📧 [email dev] → ${to}\n   ${subject}\n   ${text || ''}\n`)
    }
    return { delivered: false, dev: true }
  }
  await t.sendMail({ from: env.smtp.from, to, subject, html, text })
  return { delivered: true }
}

// Plantillas
export const emails = {
  welcome: (user) => ({
    to: user.email,
    subject: '🌱 Bienvenid@ a Brote',
    text: `Hola ${user.displayName}, ¡tu cuenta está lista! Abre tu primera sesión de foco y empieza a florecer.`,
    html: `<p>Hola <b>${user.displayName}</b>,</p><p>¡Tu cuenta en <b>Brote</b> está lista! 🌱</p><p>Abre tu primera sesión de foco y empieza a florecer junto a la comunidad.</p>`,
  }),
  sessionCompleted: (user, session) => ({
    to: user.email,
    subject: '✅ Completaste tu sesión de foco',
    text: `¡Bien hecho ${user.displayName}! Completaste ${session.goalMinutes} minutos de ${session.type === 'STUDY' ? 'estudio' : 'trabajo'}.`,
    html: `<p>¡Bien hecho <b>${user.displayName}</b>! 🎉</p><p>Completaste <b>${session.goalMinutes} minutos</b> de ${session.type === 'STUDY' ? 'estudio' : 'trabajo'}. Sigue así. 🌿</p>`,
  }),
}
