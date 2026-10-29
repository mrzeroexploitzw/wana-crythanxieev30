export const goodbyeTemplates = [
  '👋 {user} has left *{group}*. Safe travels, wherever you go.',
  '🚪 The door closes behind {user}. We will miss you in *{group}*.',
  '💨 And just like that, {user} is gone from *{group}*. Take care!',
  '😢 {user} left *{group}*. Hope to see you again sometime.',
  '🌙 {user} has exited *{group}*. Until next time.',
]

export function renderGoodbye(user, group) {
  const t = goodbyeTemplates[Math.floor(Math.random() * goodbyeTemplates.length)]
  return t.replace('{user}', user).replace('{group}', group)
}
