import express from "express";
import userRoutes from "./routes/UserRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use("/api/auth", userRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});