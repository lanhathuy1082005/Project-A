import express from "express";
import cors from "cors";
import session from "express-session";
import userRoutes from "./routes/UserRoutes.js";
import reservationRoutes from "./routes/ReservationRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors({
  origin: 'http://192.168.0.103:5173',
  credentials: true
}));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

app.use("/auth", userRoutes);
app.use("/", reservationRoutes);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});