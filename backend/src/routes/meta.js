import express from "express";

const router = express.Router();

// Public — the register form and RaiseRequest page need this without signing in.
router.get("/blood-groups", (req, res) => {
  res.json(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
});

export default router;
