# Competitive Analysis — RECALL vs. Existing Retention Systems

## Prior Art Acknowledgement

The field of spaced repetition and memory retention software has a rich history. RECALL is built with full awareness of existing solutions and explicitly differentiates itself through its **continuous decay model** and **real-time behavioral signal integration**.

## Comparison Matrix

| Feature | **Anki** (2006) | **SuperMemo** (1987) | **Quizlet** (2005) | **RECALL** |
|---------|----------------|---------------------|-------------------|------------|
| **Core Algorithm** | SM-2 (discrete intervals) | SM-18 (discrete intervals) | Basic flashcard rotation | Ebbinghaus continuous decay with HLR |
| **Retention Model** | Stepped interval scheduling | Stepped interval scheduling | None (no decay model) | Continuous exponential: `R(t) = M · 2^(-t/h)` |
| **Behavioral Signals** | Binary (pass/fail) | Grade-based (0–5) | None | Multi-signal: accuracy (60%), latency (20%), confidence (20%) |
| **Latency Tracking** | ❌ | ❌ | ❌ | ✅ Per-question response time capture |
| **Confidence Scoring** | ❌ | ❌ | ❌ | ✅ 5-point scale per question |
| **Real-Time Decay Visualization** | ❌ | ❌ | ❌ | ✅ Live Ebbinghaus curve with 7-day projection |
| **AI Question Generation** | ❌ (user-created only) | ❌ (user-created only) | Limited (Quizlet+) | ✅ Gemini 1.5 Flash with topic-adaptive prompts |
| **Half-Life Regression** | ❌ | ❌ | ❌ | ✅ Continuous HLR with behavioral multiplier adjustment |
| **Architecture** | Desktop (Electron) | Desktop (Win32) | Web (monolith) | Web (MERN + FastAPI microservice) |
| **Offline Fallback** | Full offline | Full offline | Limited | Local JS Ebbinghaus computation when AI engine unreachable |

## Key Differentiator

> **Unlike Anki/SuperMemo which use discrete Spaced Repetition System (SRS) interval scheduling, RECALL utilizes continuous Ebbinghaus decay with real-time behavioral latency weighting. This produces a smooth, mathematically continuous retention curve rather than stepped review intervals, enabling more granular insight into memory state at any arbitrary point in time.**

## Technical Justification

Traditional SRS systems (SM-2, SM-18) compute the *next review date* as a discrete timestamp. RECALL instead computes *current retention as a continuous function* — `R(t)` is defined for all `t ≥ 0`, not just at scheduled review points. This fundamental architectural difference enables:

1. **Real-time dashboarding**: Retention percentage updates live without requiring a review event.
2. **Behavioral signal fusion**: Latency and confidence modulate the half-life directly, producing a richer model than binary pass/fail.
3. **Arbitrary-time queries**: Any system component can ask "what is retention for topic X right now?" without waiting for a scheduled interval.

## References

- Ebbinghaus, H. (1885). *Über das Gedächtnis* (On Memory).
- Murre, J.M.J. & Dros, J. (2015). Replication and Analysis of Ebbinghaus' Forgetting Curve. *PLOS ONE*, 10(7).
- Settles, B. & Meeder, B. (2016). A Trainable Spaced Repetition Model for Language Learning. *ACL 2016*. (Half-Life Regression origin paper)
- Wozniak, P.A. (1990). *SuperMemo algorithm SM-2*. SuperMemo World.
