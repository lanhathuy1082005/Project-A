import { createFeedback } from '../models/Feedback.js';
import { AppError }       from '../utils/AppError.js';

export const handleSubmitFeedback = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) throw new AppError('Feedback content is required', 400);
    const feedback = await createFeedback(req.session.user.id, content.trim());
    return res.status(201).json({ message: 'Feedback submitted successfully', data: feedback });
  } catch (err) { next(err); }
};
