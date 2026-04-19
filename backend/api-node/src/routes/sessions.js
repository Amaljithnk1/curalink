import express from "express";
import { getDb } from "../db.js";

const router = express.Router();

router.get("/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const db = await getDb();
  const revisions = db.collection("revisions");

  const docs = await revisions.find({ sessionId }).sort({ createdAt: 1 }).toArray();
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.json({
    sessionId,
    revisions: docs.map(d => ({
      id: d.revisionId,
      query: d.query,
      context: d.context,
      retrieval: d.retrieval,
      brief: d.brief,
      papers: d.papers,
      trials: d.trials,
      timestamp: d.timestamp
    }))
  });
});

export default router;