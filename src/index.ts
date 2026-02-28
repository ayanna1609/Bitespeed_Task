import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { identifyContact, prisma } from "./identifyService";

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok", message: "Bitespeed Identity Reconciliation API" });
});

// /identify endpoint
app.post("/identify", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, phoneNumber } = req.body;

        // Basic validation
        if (email === undefined && phoneNumber === undefined) {
            res.status(400).json({ error: "At least one of email or phoneNumber must be provided" });
            return;
        }

        const result = await identifyContact({
            email: email ?? null,
            phoneNumber: phoneNumber !== undefined ? String(phoneNumber) : null,
        });

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    try {
        await prisma.$connect();
        console.log("✅ Database connected");
    } catch (e) {
        console.error("❌ Database connection failed:", e);
    }
});

export default app;
