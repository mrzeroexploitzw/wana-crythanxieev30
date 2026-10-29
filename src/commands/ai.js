import { sendCard } from '../branding.js'
import { chatReply, translateText } from '../lib/gemini.js'
import { config } from '../config.js'

export const aiCommands = {
  ai: {
    description: 'Chat with the AI. Usage: .ai <message>',
    permission: 'public',
    async run(ctx) {
      if (!config.geminiApiKey) {
        return sendCard(ctx.sock, ctx.jid, { lines: ['AI is not configured yet.'] })
      }
      const prompt = ctx.args.join(' ')
      if (!prompt) return sendCard(ctx.sock, ctx.jid, { lines: ['Usage: .ai <your message>'] })
      try {
        const reply = await chatReply(prompt)
        await sendCard(ctx.sock, ctx.jid, { title: 'GEMINI AI', lines: [reply || '(no response)'] })
      } catch (err) {
        await sendCard(ctx.sock, ctx.jid, { lines: ['AI request failed, try again shortly.'] })
      }
    },
  },

  translate: {
    description: 'Translate text. Usage: .translate <lang> <text>  OR reply with .translate',
    permission: 'public',
    async run(ctx) {
      if (!config.geminiApiKey) {
        return sendCard(ctx.sock, ctx.jid, { lines: ['Translator is not configured yet.'] })
      }
      let targetLang, text

      if (ctx.quotedText) {
        // .translate <lang> as a reply to a message
        targetLang = ctx.args.join(' ') || null
        text = ctx.quotedText
      } else {
        targetLang = ctx.args[0]
        text = ctx.args.slice(1).join(' ')
      }

      if (!text) {
        return sendCard(ctx.sock, ctx.jid, {
          lines: ['Usage: .translate <language> <text>', 'Or reply to a message with .translate <language>'],
        })
      }

      try {
        const result = await translateText(text, targetLang)
        await sendCard(ctx.sock, ctx.jid, { title: 'TRANSLATE', lines: [result || '(no response)'] })
      } catch {
        await sendCard(ctx.sock, ctx.jid, { lines: ['Translation failed, try again shortly.'] })
      }
    },
  },
}
