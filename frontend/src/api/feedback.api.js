import { client } from './client.js'

export const submitFeedbackApi = (content) =>
  client.post('/api/feedback', { content })
