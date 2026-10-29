// {user} {group} {count} are substituted at send time.
export const welcomeTemplates = [
  '🎉 Welcome aboard, {user}! You just joined *{group}* — member #{count}. Glad to have you here!',
  '✨ A new face appears! Say hi to {user}, our newest member of *{group}* (#{count}).',
  '🚪 The door opens... {user} has entered *{group}*! You are member number {count}.',
  '🔥 Heads up, {user} just landed in *{group}*! Make some noise — that is member #{count}.',
  '🌟 Welcome {user} to *{group}*! Hope you enjoy your stay — member #{count} and counting.',
  '🥳 New member alert: {user} just joined *{group}*. Welcome in, you are #{count}!',
]

export function renderWelcome(user, group, count) {
  const t = welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)]
  return t.replace('{user}', user).replace('{group}', group).replace('{count}', count)
}
