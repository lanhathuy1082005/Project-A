import { client } from './client';

export async function submitFeedbackApi(content: string): Promise<void> {
  await client.post('/api/feedback', { content: content.trim() });
}
