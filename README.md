# Property CRM sample

A small reference build for a property-investor CRM with an AI lead agent.
Sample data only. Every address is made up.

## What it shows

- **Pipeline board** with seven stages (new, qualified, contacted, inspecting, offer, won, lost). Stage moves follow rules, so a lead cannot skip from "new" to "won".
- **Property card** with price, estimated value, rent, gross yield, discount to value, listing text and a basic map embed.
- **AI lead agent** in three layers:
  1. Plain code checks the hard criteria (price, bedrooms, yield, discount, suburb). A property that fails is disqualified and no model call is spent.
  2. The model reads the listing text for things numbers cannot show (flood, structural, unapproved work). Listing text is treated as untrusted and fenced in the prompt.
  3. A person can override the verdict. A note is required and the change is logged.
- **Safe failure:** if the model call fails or returns something unusable, the result is "review", never a silent pass.
- **Feasibility tool** with renovation, yearly costs and vacancy.
- **Activity log** per property.

## Run it

```bash
npm install
npm test          # 28 tests
npm run typecheck
npm run dev       # http://localhost:3100
```

Without a key the agent uses a small offline stand-in (keyword check) so the demo runs anywhere. It is labelled "mock" on screen.
To use a real model:

```bash
OPENAI_API_KEY=your-key npm run dev
# optional: OPENAI_MODEL=<model name>
```

## What is real and what is not

| Part | Status |
|---|---|
| Rules, pipeline, feasibility, agent parsing, safe failure | Built and covered by tests |
| Model call | Built against the OpenAI chat completions API, tested with a mocked response. Not run against live listings. |
| Storage | In memory. `src/lib/store.ts` is the only file that changes for a PostgreSQL adapter. |
| Map | Basic OpenStreetMap embed. No aerial imagery. |
| Sign-in, multiple users, data export | Not in this sample |
| Email, SMS, phone, drip campaigns, analytics | Not in this sample |
| Real property data sources | Not in this sample |

## Layout

```
src/lib/criteria.ts      hard rules, yield, discount
src/lib/agent.ts         prompt, model call, parsing, offline stand-in
src/lib/pipeline.ts      allowed stage moves
src/lib/feasibility.ts   cost and yield calculator
src/lib/store.ts         in-memory store, activity log, overrides
src/app/                 board, property card, server actions
tests/                   vitest
```
