import { getMyTimetable } from '../models/Timetable.js';

export const handleGetMyTimetable = async (req, res, next) => {
  try {
    const data = await getMyTimetable(req.session.user.id);
    return res.json({ data });
  } catch (err) { next(err); }
};
