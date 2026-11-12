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

The measured match row came from a small test room. With 29 candidates the input grows to about 4K tokens, so measured match cost understates large rooms (expect ≈ $0.009 per call there).

## Per room

Assumptions: about half of the messages from muted members reach the model in batches of 2; one recap plus one refresh per room; each member's match runs twice (first view and one refresh after the 10-minute reuse window, `core.ts:35`). The triage cap is 300 model-triaged messages per room per day (`core.ts:27`).

| Room | Triage calls | Match calls | Recap calls | Measured | Worst case |
|---|---|---|---|---|---|
| 20 people, 3 hours | 75 | 30 | 2 | $0.09 | $0.99 |
| 50-person event day | 150 (cap) | 100 | 2 | $0.24 | $3.08 |
| 200-person school event | 150 (cap) | 400 | 2 | $0.84 | $11.78 |

Match dominates in every case; triage stays under $0.11 per room even at the cap with single-message calls ($0.21 at 300 calls).

## Monthly totals

Every room of one size, using the per-room figures above.

| Rooms per month | 20 people (measured / worst) | 50 people | 200 people |
|---|---|---|---|
| 100 | $9 / $99 | $24 / $308 | $84 / $1,178 |
| 1,000 | $94 / $990 | $240 / $3,080 | $840 / $11,780 |
| 10,000 | $940 / $9,900 | $2,400 / $30,800 | $8,400 / $117,800 |

## Not verified

- Live prices; Bedrock or Vertex pricing would differ.
- Recap token counts (add qa's recap row when it arrives and replace the estimate).
- Worst-case input sizes are estimates from the field caps, not token counts.
- Real message volume and mute rate per room.
