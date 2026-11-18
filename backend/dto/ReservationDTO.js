import { AppError } from '../utils/AppError.js';

export class ReturnRequest {
  constructor({ id, item_unit_id, scanned_item_unit_id, image_b64 }) {
    this.reservation_id       = Number(id);
    this.item_unit_id         = Number(item_unit_id);
    this.scanned_item_unit_id = scanned_item_unit_id ? Number(scanned_item_unit_id) : null;
    this.image_b64            = image_b64;
  }

  validate() {
    if (!this.reservation_id || !this.item_unit_id)
      throw new AppError('reservation id and item_unit_id is required', 400);
    if (this.scanned_item_unit_id !== this.item_unit_id)
      throw new AppError('Scanned item unit does not match the reservation item', 400);
    if (
      this.image_b64 !== undefined
      && (typeof this.image_b64 !== 'string' || this.image_b64.length === 0)
    )
      throw new AppError('image_b64 must be a non-empty string', 400);
  }
}
