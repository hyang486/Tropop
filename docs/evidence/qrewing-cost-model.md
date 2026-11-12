# Qrewing AI cost model

One page. Model API cost only (Supabase, storage and face matching are not included). Code references are to `b9d031c` (`supabase/functions/qrewing/`).

## Rates

Anthropic first-party API, per 1M tokens. Source: the bundled claude-api reference table (cached 2026-10-06); not checked against the live pricing page.

| Model | Used for | Input | Output |
|---|---|---|---|
| `claude-haiku-5-5` | triage (`prompts.ts:6`) | $0.10 | $0.50 (prompts up to 100K tokens) |
| `claude-sonnet-5-5` | recap, match (`prompts.ts:7-8`) | $2.00 | $10.00 |

No `cache_control` is sent, so there are no cache write or read charges. Thinking tokens bill as output and count inside `max_tokens`.

## Per call

| Call | Limits in code | Measured (qa usage row) | Measured cost | Worst-case cost |
|---|---|---|---|---|
| Triage | effort low, `max_tokens` 1024, ≤5 ids + 3 context messages (`core.ts:26-28, 460`) | 587 in / 42 out | $0.00008 | ≈ $0.0007 (≈1.5K in est. + 1024 out) |
| Match | effort medium, `max_tokens` 2048, ≤29 candidates, fields cut to 40/80/160/160 chars (`core.ts:34-37, 686`) | 667 in / 67 out | $0.0020 | ≈ $0.029 (≈4K in est. at 29 candidates + 2048 out) |
| Recap | effort medium, `max_tokens` 2048, ≤150 messages (`core.ts:29, 535`) | pending (qa run) | est. $0.014 (5K in / 400 out, assumed) | ≈ $0.04 (≈10K in est. + 2048 out) |
| Recap refresh | ≤50 newer messages, once (`core.ts:33, 576`) | pending | included above | ≈ $0.03 |

The measured match row came from a small test room. With 29 candidates the input grows to about 4K tokens, so measured match cost understates large rooms (expect ≈ $0.009 per call at 29 candidates, ≈ $0.006 at 19).

## Per room

Assumptions: about half of the messages from muted members reach the model in batches of 2; one recap plus one refresh per room; each member's match runs twice (first view and one refresh after the 10-minute reuse window, `core.ts:35`). The triage cap is 300 model-triaged messages per room per day (`core.ts:27`).

"At small-room rates" prices every match call at the measured $0.002; "Expected" prices it for the room's candidate count ($0.006 at 19 candidates, $0.009 at 29, both estimates).

| Room | Triage calls | Match calls | Recap calls | At small-room rates | Expected | Worst case |
|---|---|---|---|---|---|---|
| 20 people, 3 hours | 75 | 40 | 2 | $0.11 | $0.27 | $1.28 |
| 50-person event day | 150 (cap) | 100 | 2 | $0.24 | $0.94 | $3.08 |
| 200-person school event | 150 (cap) | 400 | 2 | $0.84 | $3.64 | $11.78 |

Match dominates in every case; worst-case triage is about $0.11 per room at the cap in batches of 2 (150 calls) and $0.21 with single-message calls (300 calls).

## Monthly totals

Every room of one size, using the per-room figures above (small-room rates / expected / worst case).

| Rooms per month | 20 people | 50 people | 200 people |
|---|---|---|---|
| 100 | $11 / $27 / $128 | $24 / $94 / $308 | $84 / $364 / $1,178 |
| 1,000 | $114 / $270 / $1,280 | $240 / $940 / $3,080 | $840 / $3,640 / $11,780 |
| 10,000 | $1,140 / $2,700 / $12,800 | $2,400 / $9,400 / $30,800 | $8,400 / $36,400 / $117,800 |

## Not verified

- Live prices; Bedrock or Vertex pricing would differ.
- Recap token counts (add qa's recap row when it arrives and replace the estimate).
- Worst-case input sizes are estimates from the field caps, not token counts.
- Real message volume and mute rate per room.
