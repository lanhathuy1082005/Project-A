import { AppError } from '../utils/AppError.js';

export class ReturnRequest {
  constructor({ id, item_unit_id, scanned_item_unit_id }) {
    this.reservation_id       = Number(id);
    this.item_unit_id         = Number(item_unit_id);
    this.scanned_item_unit_id = scanned_item_unit_id ? Number(scanned_item_unit_id) : null;
  }

  validate() {
    if (!this.reservation_id || !this.item_unit_id)
      throw new AppError('reservation id and item_unit_id is required', 400);
  }
}
