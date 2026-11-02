# Engineering notes

## Walk through this project in an interview

1. Start in **Overview** with labeled synthetic data. Explain that every number comes from persisted transactions, including refunds and excluded card payments.
2. Search **Transactions** for COFFEE; sort amounts, edit a category, and show recalculated analytics. Demonstrate a custom merchant rule under Settings.
3. Generate the synthetic PDF using the README command. In **Statements**, review rows and types before approval. Import again to demonstrate deterministic duplicate detection.
4. Open **AI Insights**. Local observations work without a key. Show the exact minimized payload and single-request consent without submitting it.
5. Explain the trust boundary in `privacy.py`: raw strings are never selected into external payloads, aliases are random per preview, and dollar estimates are calculated locally rather than accepted from model prose.
6. Show the integration test that uploads a generated PDF, imports rows, reimports duplicates, edits data, exports CSV, and checks dataset isolation.

## Design decisions

| Choice | Reason | Tradeoff |
| --- | --- | --- |
| Integer cents + separate transaction type | Prevent floating-point storage errors and payment double counting | Multi-currency accounts require a currency model |
| SQLite + SQLAlchemy | Simple local setup, persistence, parameterized queries | No encryption, multi-user isolation or backup manager |
| Mandatory editable preview | Regex extraction cannot safely infer every statement layout | Additional user review step |
| Allowlisted AI fields | Stronger boundary than deleting known sensitive keys | Merchant semantics are unavailable to Claude |
| Random merchant aliases | Avoid sending raw descriptions while supporting merchant-level results locally | Amounts and patterns can still identify someone |
| Single-use, expiring consent snapshot | Binds submission to exactly the reviewed payload | Restart loses pending previews |
| Local savings math | Reject unsupported monetary claims from model output | Recommendations remain estimates, not guarantees |
| Source-scoped datasets | Recruiters can explore without contaminating personal analytics | Demo edits persist until deletion/restart |

## API map

FastAPI's `/docs` and `/openapi.json` expose validated request/response documentation.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/status` | Backend and AI configuration status; never returns a key |
| GET | `/api/transactions` | Source/date/search/category/merchant filtering |
| PATCH | `/api/transactions/{id}` | Persist validated manual edits in selected dataset |
| POST | `/api/transactions/bulk` | Source-scoped bulk category updates |
| GET | `/api/analytics` | Derived metrics, categories, monthly/weekly trends, recurring merchants |
| GET | `/api/export` | Filtered CSV, with formula-injection protection |
| POST | `/api/statements/preview` | Bounded PDF extraction; no database mutation |
| POST | `/api/statements/import` | Approved rows, duplicate skipping, local dataset only |
| GET/POST | `/api/rules` | Read/save custom merchant rules |
| DELETE | `/api/rules/{merchant}` | Remove rule |
| DELETE | `/api/data?source=local` | Delete selected dataset; other dataset unaffected |
| POST | `/api/ai/preview` | Exact minimized payload and short-lived approval token |
| POST | `/api/ai/analyze` | Explicit consent, provider call, validated and grounded results |

## Parser contract

The supported transaction row shape is `MM/DD [optional posting date] DESCRIPTION [-]1,234.56[-]` with a recognizable Chase header and statement year. Known section headers distinguish purchases, deposits, payments and withdrawals. Description rules further identify refunds, transfers, payroll and card payments. Negative credit-card rows outside a payment section are treated as refunds.

The parser uses pdfplumber text extraction, with tables as fallback when page text is unavailable. It handles January/December rollover for a January-ending statement. Complex multi-year date inference, arbitrary credit/debit columns, balance lines that resemble transactions, and split descriptions require explicit parser extensions and new synthetic fixtures. Review is mandatory. No unsupported layout is claimed to be automatically reconciled.

Duplicate fingerprints preserve occurrence counts within one submitted batch. Repeated imports of the same rows are idempotent. Separate legitimate identical purchases imported individually, edited rows, and overlapping statements can be ambiguous without an institution transaction ID. No original statement files or import audit history are retained.

## Verification

Backend tests cover parser layouts, refunds/payment types, year rollover, extraction failure, normalization, rule priority, monetary calculations, recurrence, random aliasing and outbound-field allowlists, grounded estimates, real synthetic PDF upload/preview/import, repeat and within-batch duplicates, edits, exports, source isolation, filtering, bulk updates, disabled AI, mocked provider success/failure, and single-use consent.

Frontend component/API tests cover disabled approvals, link semantics, cents formatting, validation error propagation, and multipart content types. The frontend also passes strict TypeScript and a Vite production build. Browser walkthrough checks dashboard data rendering and transaction search. Broader keyboard, mobile and automated end-to-end coverage should be expanded before public-service use.

A live Claude call is intentionally unverified without a configured key. Test results do not imply support for unseen bank statement layouts. GitHub Actions is configured; hosted CI execution can only be verified after the repository is pushed.

## Local threat model and limits

This app trusts the computer owner and uses loopback only. It is not a hardened public API: there is no login, CSRF token service, job queue, worker memory/time isolation, encryption, or robust request rate limiting outside the small pending-AI-preview cap. File/page limits reduce accidental resource use but do not eliminate malicious-PDF denial of service. Use PDFs from trusted sources. Browser export sanitizes leading formula markers. No sensitive raw errors are returned from the provider.

Schema version 1 bootstraps tables through SQLAlchemy and records a version. This is an initial migration, not a replacement for future ordered Alembic upgrades. Tests are disposable in-memory databases; real local SQLite files are ignored by Git.

## Future improvements

Prioritize statement balance reconciliation and a fixture corpus before claiming broad Chase support. Add proper schema migrations, encrypted at-rest storage, process-isolated parsing with timeouts, accessible dialog focus trapping and focus restoration, category time-series comparisons, import history, consented category suggestions, and browser regression tests. Keep deployment separate from this deliberately local repository.
