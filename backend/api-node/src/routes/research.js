import express from "express";
import { getDb } from "../db.js";

const router = express.Router();

router.post("/run", async (req, res) => {
  try {
    const { sessionId, query, context } = req.body || {};
    if (!query || !context?.condition) {
      return res.status(400).json({ error: "query and context.condition required" });
    }

    const MEDICAL_KEYWORDS = ['disease', 'disorder', 'syndrome', 'cancer', 'diabetes',
      'tumor', 'infection', 'therapy', 'treatment', 'parkinson', 'alzheimer',
      'depression', 'anxiety', 'heart', 'lung', 'brain', 'blood', 'pain',
      'chronic', 'acute', 'symptoms', 'virus', 'bacterial', 'immune', 'stroke',
      'arthritis', 'asthma', 'epilepsy', 'dementia', 'obesity', 'migraine'];

    function isMedicalCondition(condition) {
      if (!condition || condition.length < 3) return false;
      const lower = condition.toLowerCase();
      const hasKeyword = MEDICAL_KEYWORDS.some(k => lower.includes(k));
      const isMultiWord = lower.trim().split(/\s+/).length >= 2;
      return hasKeyword || isMultiWord;
    }

    if (!isMedicalCondition(context.condition)) {
      return res.status(400).json({
        error: "invalid_condition",
        message: "No medical research found for this condition."
      });
    }

    const db = await getDb();
    const sessions = db.collection("sessions");
    const revisions = db.collection("revisions");

    const sid = sessionId || crypto.randomUUID();

    await sessions.updateOne(
      { sessionId: sid },
      { $setOnInsert: { sessionId: sid, createdAt: new Date() } },
      { upsert: true }
    );

    // create revision id for engine
    const revCount = await revisions.countDocuments({ sessionId: sid });
    const revisionId = `R${revCount + 1}`;

    const engineUrl = process.env.ENGINE_URL || "http://127.0.0.1:8000";
    const r = await fetch(`${engineUrl}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, context, revisionId })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: "engine_failed", details: txt });
    }

    const revision = await r.json();

    await revisions.insertOne({
      sessionId: sid,
      revisionId: revision.id,
      query: revision.query,
      context: revision.context,
      retrieval: revision.retrieval,
      brief: revision.brief,
      papers: revision.papers,
      trials: revision.trials,
      timestamp: revision.timestamp,
      createdAt: new Date()
    });

    res.json({ sessionId: sid, revision });
  } catch (e) {
    res.status(500).json({ error: "server_error", details: String(e) });
  }
});

export default router;