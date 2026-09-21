"""
DB Service — FastAPI + asyncpg
Owns all direct SQL access to Postgres for Project-A. The Node backend talks
to this service over HTTP instead of querying Postgres itself.

Run: uvicorn main:app --host 0.0.0.0 --port 8001
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

DB_USER = os.getenv("DB_USER", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "project_a")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_PORT = int(os.getenv("DB_PORT", "5432"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(
        user=DB_USER, host=DB_HOST, database=DB_NAME,
        password=DB_PASSWORD, port=DB_PORT,
        min_size=1, max_size=10,
    )
    yield
    await app.state.pool.close()


app = FastAPI(title="DB Service", version="1.0.0", lifespan=lifespan)


def rows_to_list(records):
    return [dict(r) for r in records]


def row_to_dict(record):
    return dict(record) if record else None


@app.get("/health")
async def health():
    return {"status": "ok"}


# ── DTOs ─────────────────────────────────────────────────────────────────────

class CreateUser(BaseModel):
    id: str
    password_hash: str


class CreateAttendance(BaseModel):
    user_id: str
    timetable_id: int


class UpsertItem(BaseModel):
    name: str


class UpsertItemUnit(BaseModel):
    item_id: Optional[int] = None
    lab_id: Optional[int] = None
    status: Optional[str] = None


class CreateFeedback(BaseModel):
    user_id: str
    content: str


class UpsertClass(BaseModel):
    course_id: int
    day_of_week: int
    start_time: str
    end_time: str


class BorrowRequest(BaseModel):
    item_unit_id: int
    user_id: str


class ReturnRequest(BaseModel):
    item_unit_id: int


# ── Users ────────────────────────────────────────────────────────────────────

@app.get("/users/{user_id}")
async def get_user_by_user_id(user_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT u.id, u.password_hash, r.name AS role
               FROM users u JOIN roles r ON u.role_id = r.id
               WHERE u.id = $1""",
            user_id,
        )
    return row_to_dict(row)


@app.post("/users")
async def create_user(body: CreateUser):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """WITH new_user AS (
                 INSERT INTO users (id, password_hash, role_id)
                 VALUES ($1, $2, 1)
                 RETURNING id, role_id
               )
               SELECT nu.id, r.name AS role
               FROM new_user nu JOIN roles r ON r.id = nu.role_id""",
            body.id, body.password_hash,
        )
    return row_to_dict(row)


@app.post("/attendance")
async def create_attendance_record(body: CreateAttendance):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO attendance (user_id, timetable_id)
               VALUES ($1, $2) RETURNING *""",
            body.user_id, body.timetable_id,
        )
    return row_to_dict(row)


@app.get("/users/{user_id}/valid-timetable")
async def get_valid_timetable_for_user(user_id: str):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT t.id FROM timetable t
               JOIN timetable_user tu ON tu.timetable_id = t.id
               WHERE tu.user_id = $1
               AND t.day_of_week = EXTRACT(DOW FROM NOW())
               AND NOW()::TIME BETWEEN t.start_time AND t.end_time""",
            user_id,
        )
    return row_to_dict(row)


# ── Items ────────────────────────────────────────────────────────────────────

@app.get("/items")
async def get_all_items():
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM items ORDER BY id")
    return {"data": rows_to_list(rows)}


@app.post("/items")
async def add_item(body: UpsertItem):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO items (name) VALUES ($1) RETURNING *", body.name
        )
    return row_to_dict(row)


@app.put("/items/{item_id}")
async def update_item(item_id: int, body: UpsertItem):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE items SET name = $1 WHERE id = $2 RETURNING *",
            body.name, item_id,
        )
    if not row:
        raise HTTPException(404, "Item not found")
    return row_to_dict(row)


@app.delete("/items/{item_id}")
async def delete_item(item_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM items WHERE id = $1 RETURNING *", item_id
        )
    if not row:
        raise HTTPException(404, "Item not found")
    return row_to_dict(row)


@app.get("/item-units")
async def get_all_item_units(
    limit: int = Query(20), offset: int = Query(0), status: Optional[str] = None
):
    conditions = []
    params = []
    idx = 1
    if status:
        conditions.append(f"iu.status = ${idx}")
        params.append(status)
        idx += 1
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT iu.id, iu.status,
                       i.id AS item_id, i.name AS item_name,
                       l.id AS lab_id, l.name AS lab_name
                FROM item_units iu
                JOIN items i ON i.id = iu.item_id
                LEFT JOIN labs l ON l.id = iu.lab_id
                {where}
                ORDER BY iu.id
                LIMIT ${idx} OFFSET ${idx + 1}""",
            *params, limit, offset,
        )
        total = await conn.fetchval(
            f"SELECT COUNT(*) FROM item_units iu {where}", *params
        )
    return {"data": rows_to_list(rows), "total": total}


@app.post("/item-units")
async def add_item_unit(body: UpsertItemUnit):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO item_units (item_id, lab_id) VALUES ($1, $2) RETURNING *",
            body.item_id, body.lab_id,
        )
    return row_to_dict(row)


@app.put("/item-units/{unit_id}")
async def update_item_unit(unit_id: int, body: UpsertItemUnit):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE item_units
               SET lab_id = COALESCE($1, lab_id),
                   status = COALESCE($2, status)
               WHERE id = $3
               RETURNING *""",
            body.lab_id, body.status, unit_id,
        )
    if not row:
        raise HTTPException(404, "Item unit not found")
    return row_to_dict(row)


@app.delete("/item-units/{unit_id}")
async def delete_item_unit(unit_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM item_units WHERE id = $1 RETURNING *", unit_id
        )
    if not row:
        raise HTTPException(404, "Item unit not found")
    return row_to_dict(row)


@app.get("/inventory/stats")
async def get_inventory_stats():
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT
                 COUNT(*) FILTER (WHERE status = 'Borrowed') AS borrowed_count,
                 COUNT(*) FILTER (WHERE status = 'Maintenance') AS maintenance_count,
                 COUNT(*) FILTER (WHERE status = 'Available') AS available_count
               FROM item_units"""
        )
    return row_to_dict(row)


@app.get("/labs/{lab_id}/checklist")
async def get_lab_checklist(lab_id: int):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT iu.id, iu.status, i.name AS item_name
               FROM item_units iu
               JOIN items i ON i.id = iu.item_id
               WHERE iu.lab_id = $1
               ORDER BY i.name""",
            lab_id,
        )
    return {"data": rows_to_list(rows)}


# ── Labs ─────────────────────────────────────────────────────────────────────

@app.get("/labs")
async def get_all_labs():
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM labs ORDER BY id")
    return {"data": rows_to_list(rows)}


@app.get("/labs/{lab_id}")
async def get_lab_by_id(lab_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM labs WHERE id = $1", lab_id)
    return row_to_dict(row)


# ── Courses ──────────────────────────────────────────────────────────────────

@app.get("/courses")
async def get_all_courses():
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM courses ORDER BY id")
    return {"data": rows_to_list(rows)}


# ── Feedback ─────────────────────────────────────────────────────────────────

@app.post("/feedback")
async def create_feedback(body: CreateFeedback):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO feedback (user_id, content) VALUES ($1, $2) RETURNING *",
            body.user_id, body.content,
        )
    return row_to_dict(row)


@app.get("/feedback")
async def get_all_feedback(limit: int = Query(20), offset: int = Query(0)):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT f.*, u.id AS user_id
               FROM feedback f JOIN users u ON u.id = f.user_id
               ORDER BY f.created_at DESC
               LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM feedback")
    return {"data": rows_to_list(rows), "total": total}


# ── Timetable / Classes ──────────────────────────────────────────────────────

@app.get("/classes")
async def get_all_classes(limit: int = Query(20), offset: int = Query(0)):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT t.id, t.day_of_week, t.start_time, t.end_time,
                      c.id AS course_id, c.name AS course_name
               FROM timetable t JOIN courses c ON c.id = t.course_id
               ORDER BY t.day_of_week, t.start_time
               LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval("SELECT COUNT(*) FROM timetable")
    return {"data": rows_to_list(rows), "total": total}


@app.get("/classes/{timetable_id}/students")
async def get_class_students(timetable_id: int):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT u.id AS user_id, u.created_at
               FROM timetable_user tu JOIN users u ON u.id = tu.user_id
               WHERE tu.timetable_id = $1
               ORDER BY u.id""",
            timetable_id,
        )
    return {"data": rows_to_list(rows)}


@app.post("/classes")
async def create_class(body: UpsertClass):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO timetable (course_id, day_of_week, start_time, end_time)
               VALUES ($1, $2, $3, $4) RETURNING *""",
            body.course_id, body.day_of_week, body.start_time, body.end_time,
        )
    return row_to_dict(row)


@app.put("/classes/{timetable_id}")
async def update_class(timetable_id: int, body: UpsertClass):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE timetable
               SET course_id = $1, day_of_week = $2, start_time = $3, end_time = $4
               WHERE id = $5
               RETURNING *""",
            body.course_id, body.day_of_week, body.start_time, body.end_time, timetable_id,
        )
    if not row:
        raise HTTPException(404, "Class not found")
    return row_to_dict(row)


@app.delete("/classes/{timetable_id}")
async def delete_class(timetable_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            "DELETE FROM timetable WHERE id = $1 RETURNING *", timetable_id
        )
    if not row:
        raise HTTPException(404, "Class not found")
    return row_to_dict(row)


@app.get("/sessions/today")
async def get_today_sessions():
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT t.id, t.start_time, t.end_time, c.name AS course_name
               FROM timetable t JOIN courses c ON c.id = t.course_id
               WHERE t.day_of_week = EXTRACT(DOW FROM NOW())
               ORDER BY t.start_time"""
        )
    return {"data": rows_to_list(rows)}


# ── Reservations ─────────────────────────────────────────────────────────────

def _reservation_filters(conditions, params, idx, status, user_id, class_id, date_from, date_to):
    if status == "not_returned":
        conditions.append("actual_return_date IS NULL")
    elif status == "overdue":
        conditions.append("actual_return_date IS NULL AND DATE(borrow_date) < CURRENT_DATE")
    elif status == "returned":
        conditions.append("actual_return_date IS NOT NULL")

    if user_id:
        conditions.append(f"user_id = ${idx}")
        params.append(user_id)
        idx += 1
    if class_id:
        conditions.append(f"id IN (SELECT r2.id FROM reservations r2 WHERE r2.timetable_id = ${idx})")
        params.append(class_id)
        idx += 1
    if date_from:
        conditions.append(f"borrow_date >= ${idx}")
        params.append(date_from)
        idx += 1
    if date_to:
        conditions.append(f"borrow_date <= ${idx}")
        params.append(date_to)
        idx += 1
    return idx


@app.get("/users/{user_id}/reservations")
async def get_user_reservations(user_id: str, limit: int = Query(20), offset: int = Query(0)):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM v_reservations
               WHERE user_id = $1 AND actual_return_date IS NULL
               ORDER BY borrow_date DESC
               LIMIT $2 OFFSET $3""",
            user_id, limit, offset,
        )
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM v_reservations WHERE user_id = $1 AND actual_return_date IS NULL",
            user_id,
        )
    return {"data": rows_to_list(rows), "total": total}


@app.get("/reservations")
async def get_all_reservations(
    limit: int = Query(20), offset: int = Query(0),
    status: Optional[str] = None, user_id: Optional[str] = None,
    class_id: Optional[int] = None, date_from: Optional[str] = None, date_to: Optional[str] = None,
):
    conditions, params = [], []
    idx = _reservation_filters(conditions, params, 1, status, user_id, class_id, date_from, date_to)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT * FROM v_reservations
                {where}
                ORDER BY borrow_date DESC
                LIMIT ${idx} OFFSET ${idx + 1}""",
            *params, limit, offset,
        )
        total = await conn.fetchval(f"SELECT COUNT(*) FROM v_reservations {where}", *params)
    return {"data": rows_to_list(rows), "total": total}


@app.get("/reservations/pending-returns")
async def get_pending_returns(limit: int = Query(20), offset: int = Query(0)):
    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM v_reservations
               WHERE actual_return_date IS NOT NULL AND approved IS NULL
               ORDER BY actual_return_date ASC
               LIMIT $1 OFFSET $2""",
            limit, offset,
        )
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM v_reservations WHERE actual_return_date IS NOT NULL AND approved IS NULL"
        )
    return {"data": rows_to_list(rows), "total": total}


@app.get("/reservations/logs")
async def get_reservation_logs(
    limit: int = Query(20), offset: int = Query(0),
    user_id: Optional[str] = None, class_id: Optional[int] = None,
    date_from: Optional[str] = None, date_to: Optional[str] = None,
):
    conditions, params = [], []
    idx = _reservation_filters(conditions, params, 1, None, user_id, class_id, date_from, date_to)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    async with app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            f"""SELECT * FROM v_reservations
                {where}
                ORDER BY borrow_date DESC
                LIMIT ${idx} OFFSET ${idx + 1}""",
            *params, limit, offset,
        )
        total = await conn.fetchval(f"SELECT COUNT(*) FROM v_reservations {where}", *params)
    return {"data": rows_to_list(rows), "total": total}


@app.get("/reservations/stats/dashboard")
async def get_dashboard_stats():
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT
                 COUNT(*) FILTER (WHERE actual_return_date IS NULL) AS active_borrows,
                 COUNT(*) FILTER (WHERE actual_return_date IS NOT NULL AND approved IS NULL) AS pending_returns
               FROM reservations"""
        )
    return row_to_dict(row)


@app.get("/reservations/{reservation_id}")
async def get_reservation_by_id(reservation_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM v_reservations WHERE id = $1", reservation_id)
    return row_to_dict(row)


@app.post("/reservations/borrow")
async def borrow_item(body: BorrowRequest):
    """Atomic borrow flow: lock the item unit row, validate state, course/timetable
    eligibility, insert the reservation and flip the unit to Borrowed — all in one
    transaction (this used to be hand-rolled BEGIN/COMMIT logic in the Node service)."""
    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            unit = await conn.fetchrow(
                "SELECT id, item_id, status FROM item_units WHERE id = $1 FOR UPDATE",
                body.item_unit_id,
            )
            if not unit:
                raise HTTPException(404, "Item unit not found")
            if unit["status"] == "Broken":
                raise HTTPException(400, "This device is broken and cannot be borrowed")
            if unit["status"] == "Borrowed":
                raise HTTPException(409, "Device is already being borrowed")

            course = await conn.fetchrow(
                """SELECT ci.course_id FROM course_item ci
                   JOIN items i ON ci.item_id = i.id
                   WHERE i.id = $1""",
                unit["item_id"],
            )
            if not course:
                raise HTTPException(400, "Item is not available for the current course")

            timetable = await conn.fetchrow(
                """SELECT tu.timetable_id FROM timetable_user tu
                   JOIN timetable t ON tu.timetable_id = t.id
                   WHERE t.start_time <= NOW()::TIME AND t.end_time >= NOW()::TIME
                   AND t.day_of_week = EXTRACT(DOW FROM NOW())
                   AND tu.user_id = $1
                   LIMIT 1""",
                body.user_id,
            )
            if not timetable:
                raise HTTPException(404, "No active timetable found for the user")

            reservation = await conn.fetchrow(
                """INSERT INTO reservations (item_unit_id, user_id, timetable_id)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (item_unit_id) WHERE actual_return_date IS NULL DO NOTHING
                   RETURNING *""",
                unit["id"], body.user_id, timetable["timetable_id"],
            )
            if not reservation:
                raise HTTPException(409, "Device is already being borrowed by another user")

            await conn.execute(
                "UPDATE item_units SET status = 'Borrowed' WHERE id = $1", unit["id"]
            )
    return row_to_dict(reservation)


@app.post("/reservations/{reservation_id}/return")
async def return_item(reservation_id: int, body: ReturnRequest):
    """Marks the reservation returned and flips the unit to 'Needs Checking' atomically."""
    async with app.state.pool.acquire() as conn:
        async with conn.transaction():
            reservation = await conn.fetchrow(
                """UPDATE reservations
                   SET actual_return_date = NOW()
                   WHERE id = $1 AND actual_return_date IS NULL
                   RETURNING *""",
                reservation_id,
            )
            if not reservation:
                raise HTTPException(400, "Reservation does not exist or already returned")

            await conn.execute(
                "UPDATE item_units SET status = 'Needs Checking' WHERE id = $1",
                body.item_unit_id,
            )
    return row_to_dict(reservation)


@app.post("/reservations/{reservation_id}/approve")
async def approve_return(reservation_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE reservations SET approved = TRUE
               WHERE id = $1 AND approved IS NULL
               RETURNING *""",
            reservation_id,
        )
    if not row:
        raise HTTPException(400, "Reservation not found or already processed")
    return row_to_dict(row)


@app.post("/reservations/{reservation_id}/report-issue")
async def report_issue(reservation_id: int):
    async with app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE reservations SET approved = FALSE
               WHERE id = $1 AND approved IS NULL
               RETURNING *""",
            reservation_id,
        )
    if not row:
        raise HTTPException(400, "Reservation not found or already processed")
    return row_to_dict(row)
