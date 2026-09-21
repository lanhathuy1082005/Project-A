# Project-A

Hệ thống mượn/trả thiết bị phòng Lab.

- **frontend** — React/Vite
- **backend** — Node.js/Express (business logic, session, routing)
- **db-service** — Python/FastAPI + asyncpg, tầng truy cập dữ liệu duy nhất chạm vào Postgres. Backend gọi sang service này qua HTTP thay vì tự query DB.
- **face-service** — Python/FastAPI + DeepFace, nhận diện khuôn mặt
- **PostgreSQL** — lưu trữ dữ liệu

## Chạy toàn bộ bằng Docker (khuyến nghị)

**Yêu cầu:** Docker Desktop đang chạy.

```bash
git clone https://github.com/lanhathuy1082005/Project-A.git
cd Project-A
docker compose up --build
```

Lần build đầu tiên sẽ mất khá lâu (face-service cài TensorFlow/DeepFace, có thể vài trăm MB tải về). Các lần sau chỉ cần:

```bash
docker compose up
```

### Các service sau khi chạy

| Service | URL | Ghi chú |
|---|---|---|
| Frontend | http://localhost:5173 | React/Vite dev server |
| Backend API | http://localhost:3000 | Express, health check tại `/health` |
| DB service | http://localhost:8001 | FastAPI, health check tại `/health` — tầng truy cập Postgres |
| Face service | http://localhost:8000 | FastAPI, health check tại `/health` |
| PostgreSQL | localhost:5432 | user `postgres` / pass `postgres` / db `project_a` |

Database sẽ tự động được khởi tạo từ `database/project_a.dump` khi container Postgres chạy lần đầu (chỉ chạy khi volume `pgdata` còn trống).

### Tài khoản test có sẵn

| ID đăng nhập | Role |
|---|---|
| `user1` | student |
| `user2` | student |
| `admin` | admin |

> Mật khẩu đã được hash sẵn trong dump — nếu cần đăng nhập, reset mật khẩu qua `docker compose exec postgres psql -U postgres -d project_a` rồi `UPDATE users SET password_hash = '<bcrypt hash>'`.

### Dừng / dọn dẹp

```bash
docker compose down          # dừng, giữ lại data (volume pgdata, face_data)
docker compose down -v       # dừng và xóa luôn data (reset về dump gốc)
```

### Tùy chỉnh cấu hình

Biến môi trường cho từng service được khai báo trong `docker-compose.yml` (mục `environment`). Sửa trực tiếp file này nếu cần đổi port, mật khẩu DB, CORS origins, v.v.

---

## Chạy thủ công (không dùng Docker)

Cần cài sẵn: Node.js, PostgreSQL 18, Python 3.10+ (nếu chạy face service).

### 1. Database
Tạo database `project_a` rồi restore dump:
```bash
pg_restore -U postgres -d project_a --no-owner --no-privileges database/project_a.dump
```

### 2. DB Service
```bash
cd backend/services/db-service
python -m venv venv
./venv/Scripts/activate     # Windows
pip install -r requirements.txt
DB_USER=postgres DB_HOST=localhost DB_NAME=project_a DB_PASSWORD=postgres \
  uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Backend
```bash
cd backend
cp .env.example .env   # DB_SERVICE_URL mặc định trỏ về http://localhost:8001
npm install
npm run dev
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 5. Face service (tùy chọn)
```bash
cd backend/services/face
python -m venv venv
./venv/Scripts/activate     # Windows
pip install -r requirements.txt
uvicorn face_service:app --host 0.0.0.0 --port 8000 --reload
```

---

## Quản lý repo (Git)

```bash
git pull origin main
git add .
git commit -m "message"
git push origin main
```
