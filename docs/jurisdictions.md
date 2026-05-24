# Default Holiday Rule Sets — Jurisdiction Reference

> **Important framing.** The 66 jurisdictions listed here are implemented as **default holiday rule sets** in `cpm-engine.js`. They are *not* legally certified calendars. The engine encodes a default set of statutory and observed holidays for each jurisdiction based on the framework citations below. They are sufficient for general-purpose CPM date math and forensic schedule analysis.
>
> Before relying on these defaults in a regulated, contractual, or court-facing context, **verify the operative holiday list against the jurisdiction's current statute** (and any project-specific contract calendar). The engine accepts custom calendars via `opts.calendar` for exactly this reason — a Daubert-defensible analysis names the calendar source it used, not the engine's default.
>
> See [`DAUBERT.md` §1 Qualifications and §2 Methodology Tested](../DAUBERT.md) for the surrounding disclosure posture.

---

## API surface

```js
const E = require('./cpm-engine.js');

// All 66 default rule set codes (sorted):
E.LISTED_JURISDICTIONS
// → ["CA-AB", "CA-BC", "CA-FED", ..., "US-WV", "US-WY"]

// Holiday list for a jurisdiction across a calendar year range:
const holidays = E.getHolidays('CA-FED', 2026, 2028);
// → ["2026-01-01", "2026-04-03", "2026-05-18", "2026-07-01", ...]
//   (array of ISO-8601 date strings, sorted ascending)

// To inject the holidays into a computeCPM calendar map, use
// getJurisdictionCalendar() which packages the holiday list with a
// workday-week and a year range in the shape computeCPM expects:
const onCalendar = E.getJurisdictionCalendar('CA-ON',
                                              { from_year: 2026, to_year: 2028 });
// → { work_days: [1,2,3,4,5], holidays: ['2026-01-01', ...],
//     jurisdiction: 'CA-ON', year_range: [2026, 2028] }
```

The default rule sets are exposed at module scope as `E.LISTED_JURISDICTIONS` and are queryable via:

- `E.getHolidays(jurisdiction, startYear, endYear)` — returns a sorted array of ISO-8601 date strings (no holiday names or metadata; the engine only needs dates for its calendar math).
- `E.getJurisdictionCalendar(jurisdiction, opts)` — returns a `{ work_days, holidays, jurisdiction, year_range }` object suitable as a `cal_map` entry passed into `computeCPM(activities, relationships, { cal_map: { ... } })`.

---

## Framework citations — Federal jurisdictions (verified)

These two are the federal labour-and-holiday statutes for Canada and the United States. The engine's default rule sets for CA-FED and US-FED are derived from these statutes.

| Code | Jurisdiction | Framework Citation | Verified Authoritative Source |
|------|---|---|---|
| `CA-FED` | Canada — Federal | *Canada Labour Code*, R.S.C., 1985, c. L-2, Part III (General Holidays) | <https://laws-lois.justice.gc.ca/eng/acts/L-2/> |
| `US-FED` | United States — Federal | 5 U.S.C. § 6103 (Holidays) | <https://www.law.cornell.edu/uscode/text/5/6103> |

---

## Default rule sets — Canadian provinces and territories

The 13 Canadian provincial and territorial rule sets are derived from each jurisdiction's employment-standards or labour-standards framework. **Holiday observance varies materially across provinces** (e.g., Family Day exists in AB/BC/ON/NB/SK but not in QC; National Day for Truth and Reconciliation observance varies). Verify against the operative provincial statute before forensic use.

| Code | Jurisdiction | Default Framework Type | Authoritative Source |
|------|---|---|---|
| `CA-AB` | Alberta | Employment Standards Code (statutory holidays) | Government of Alberta — Employment Standards |
| `CA-BC` | British Columbia | Employment Standards Act (statutory holidays) | Government of British Columbia — Employment Standards |
| `CA-MB` | Manitoba | Employment Standards Code (general holidays) | Government of Manitoba — Employment Standards |
| `CA-NB` | New Brunswick | Employment Standards Act (prescribed days of rest) | Government of New Brunswick — Employment Standards |
| `CA-NL` | Newfoundland & Labrador | Labour Standards Act (paid holidays) | Government of Newfoundland and Labrador — Labour Standards |
| `CA-NS` | Nova Scotia | Labour Standards Code (paid holidays) | Government of Nova Scotia — Labour Standards |
| `CA-NT` | Northwest Territories | Employment Standards Act (statutory holidays) | Government of Northwest Territories — Employment Standards |
| `CA-NU` | Nunavut | Labour Standards Act (statutory holidays) | Government of Nunavut — Labour Standards |
| `CA-ON` | Ontario | Employment Standards Act, 2000 (public holidays) | Government of Ontario — Employment Standards |
| `CA-PE` | Prince Edward Island | Employment Standards Act (paid holidays) | Government of Prince Edward Island — Employment Standards |
| `CA-QC` | Quebec | *Act respecting labour standards / Loi sur les normes du travail* | Commission des normes, de l'équité, de la santé et de la sécurité du travail (CNESST) |
| `CA-SK` | Saskatchewan | *Saskatchewan Employment Act* (public holidays) | Government of Saskatchewan — Labour Standards |
| `CA-YT` | Yukon | Employment Standards Act (statutory holidays) | Government of Yukon — Employment Standards |

---

## Default rule sets — United States — 50 states + District of Columbia

The 51 US sub-federal rule sets are derived from each state's (or DC's) statutory or executive-order framework on legal holidays. **State holiday observance varies materially** (e.g., Lincoln's Birthday, state-specific founding days, regional cultural holidays). Verify against the operative state code or executive order before forensic use.

| Code | Jurisdiction | Default Framework Type | Authoritative Source |
|------|---|---|---|
| `US-AK` | Alaska | Alaska Statutes — Legal Holidays | State of Alaska — Department of Administration |
| `US-AL` | Alabama | Code of Alabama — Legal Holidays | State of Alabama — Code of Alabama |
| `US-AR` | Arkansas | Arkansas Code — State Holidays | State of Arkansas — Code of Arkansas |
| `US-AZ` | Arizona | Arizona Revised Statutes — Legal Holidays | State of Arizona — Revised Statutes |
| `US-CA` | California | California Government Code — Holidays | State of California — Government Code |
| `US-CO` | Colorado | Colorado Revised Statutes — Legal Holidays | State of Colorado — Revised Statutes |
| `US-CT` | Connecticut | Connecticut General Statutes — Holidays | State of Connecticut — General Statutes |
| `US-DC` | District of Columbia | DC Official Code — Holidays | District of Columbia — Official Code |
| `US-DE` | Delaware | Delaware Code — Legal Holidays | State of Delaware — Delaware Code |
| `US-FL` | Florida | Florida Statutes — Legal Holidays | State of Florida — Florida Statutes |
| `US-GA` | Georgia | Official Code of Georgia Annotated — Public Holidays | State of Georgia — Official Code Annotated |
| `US-HI` | Hawaii | Hawaii Revised Statutes — Holidays | State of Hawaii — Revised Statutes |
| `US-IA` | Iowa | Iowa Code — Legal Holidays | State of Iowa — Iowa Code |
| `US-ID` | Idaho | Idaho Statutes — Holidays | State of Idaho — Idaho Statutes |
| `US-IL` | Illinois | Illinois Compiled Statutes — Holidays | State of Illinois — Compiled Statutes |
| `US-IN` | Indiana | Indiana Code — Legal Holidays | State of Indiana — Indiana Code |
| `US-KS` | Kansas | Kansas Statutes Annotated — Holidays | State of Kansas — Statutes Annotated |
| `US-KY` | Kentucky | Kentucky Revised Statutes — Legal Holidays | Commonwealth of Kentucky — Revised Statutes |
| `US-LA` | Louisiana | Louisiana Revised Statutes — Legal Holidays | State of Louisiana — Revised Statutes |
| `US-MA` | Massachusetts | Massachusetts General Laws — Legal Holidays | Commonwealth of Massachusetts — General Laws |
| `US-MD` | Maryland | Maryland General Provisions Code — Legal Holidays | State of Maryland — General Provisions Code |
| `US-ME` | Maine | Maine Revised Statutes — Legal Holidays | State of Maine — Revised Statutes |
| `US-MI` | Michigan | Michigan Compiled Laws — Legal Holidays | State of Michigan — Compiled Laws |
| `US-MN` | Minnesota | Minnesota Statutes — Legal Holidays | State of Minnesota — Statutes |
| `US-MO` | Missouri | Missouri Revised Statutes — Public Holidays | State of Missouri — Revised Statutes |
| `US-MS` | Mississippi | Mississippi Code — Legal Holidays | State of Mississippi — Mississippi Code |
| `US-MT` | Montana | Montana Code Annotated — Legal Holidays | State of Montana — Code Annotated |
| `US-NC` | North Carolina | North Carolina General Statutes — Public Holidays | State of North Carolina — General Statutes |
| `US-ND` | North Dakota | North Dakota Century Code — Holidays | State of North Dakota — Century Code |
| `US-NE` | Nebraska | Nebraska Revised Statutes — Holidays | State of Nebraska — Revised Statutes |
| `US-NH` | New Hampshire | New Hampshire Revised Statutes — Legal Holidays | State of New Hampshire — Revised Statutes |
| `US-NJ` | New Jersey | New Jersey Statutes — Legal Holidays | State of New Jersey — Statutes |
| `US-NM` | New Mexico | New Mexico Statutes Annotated — Legal Holidays | State of New Mexico — Statutes Annotated |
| `US-NV` | Nevada | Nevada Revised Statutes — Legal Holidays | State of Nevada — Revised Statutes |
| `US-NY` | New York | New York General Construction Law — Public Holidays | State of New York — General Construction Law |
| `US-OH` | Ohio | Ohio Revised Code — Legal Holidays | State of Ohio — Revised Code |
| `US-OK` | Oklahoma | Oklahoma Statutes — Legal Holidays | State of Oklahoma — Oklahoma Statutes |
| `US-OR` | Oregon | Oregon Revised Statutes — Legal Holidays | State of Oregon — Revised Statutes |
| `US-PA` | Pennsylvania | Pennsylvania Consolidated Statutes — Legal Holidays | Commonwealth of Pennsylvania — Consolidated Statutes |
| `US-RI` | Rhode Island | Rhode Island General Laws — Legal Holidays | State of Rhode Island — General Laws |
| `US-SC` | South Carolina | South Carolina Code — Legal Holidays | State of South Carolina — Code of Laws |
| `US-SD` | South Dakota | South Dakota Codified Laws — Holidays | State of South Dakota — Codified Laws |
| `US-TN` | Tennessee | Tennessee Code Annotated — Legal Holidays | State of Tennessee — Code Annotated |
| `US-TX` | Texas | Texas Government Code — Holidays | State of Texas — Government Code |
| `US-UT` | Utah | Utah Code — Legal Holidays | State of Utah — Utah Code |
| `US-VA` | Virginia | Code of Virginia — Legal Holidays | Commonwealth of Virginia — Code of Virginia |
| `US-VT` | Vermont | Vermont Statutes — Legal Holidays | State of Vermont — Statutes |
| `US-WA` | Washington | Revised Code of Washington — Legal Holidays | State of Washington — Revised Code |
| `US-WI` | Wisconsin | Wisconsin Statutes — Legal Holidays | State of Wisconsin — Statutes |
| `US-WV` | West Virginia | West Virginia Code — Legal Holidays | State of West Virginia — West Virginia Code |
| `US-WY` | Wyoming | Wyoming Statutes — Legal Holidays | State of Wyoming — Wyoming Statutes |

---

## Forensic-use guidance

For a Daubert-defensible analysis:

1. **State the calendar source explicitly.** Do not rely on the engine's default. Declare which jurisdiction code was used (e.g., `CA-ON`) **and** the date the holiday list was reconciled against the operative statute.
2. **Override defaults when contractual calendars differ.** Most construction contracts specify a project-specific work calendar (e.g., 5×10, 6×10, owner-defined holidays). Pass the contract calendar via `opts.calendar` rather than relying on the jurisdictional default.
3. **Verify against the operative statute for the analysis year.** Holiday law changes (e.g., National Day for Truth and Reconciliation became a federal stat holiday in Canada in 2021; some provinces have not adopted it for non-federally-regulated workplaces). The engine's defaults are reconciled at the engine version's tagged date — they are not auto-updated.
4. **Document calendar selection in the manifest.** The engine's `result.manifest` carries `calendar_count`; record which calendars were used and which jurisdictions sourced them in the analyst signoff for the report.

For non-forensic CPM (planning, lookahead, monthly progress reporting), the default rule sets are appropriate as-is. Forensic use raises the verification bar; that is the burden of the analyst, not the engine.

---

## What the engine guarantees

- **Implementation:** 66 default holiday rule sets are encoded in `cpm-engine.js` and exposed via `E.LISTED_JURISDICTIONS` and `E.getHolidays()`.
- **JS/Python parity:** The Python reference (`python_reference/cpm.py`) implements the same 66 rule sets; the crossval suite verifies them on every release.
- **Public API:** `E.getHolidays(jurisdiction, startYear, endYear)` returns the rule-set output as a typed array of `{ date, name, jurisdiction }` objects.

## What the engine does not guarantee

- The default rule sets are **not** legally certified. They are framework-aligned defaults sufficient for general-purpose date math.
- The default rule sets are **not** auto-updated when a jurisdiction amends its statutory holiday list. The analyst must verify currency against the operative statute for the analysis year.
- The default rule sets do **not** encode industry-specific or contract-specific calendars (e.g., construction project calendars with shutdown weeks, owner-mandated working Saturdays, regulated-industry compressed work weeks). These must be supplied via `opts.calendar`.

---

*Document version: aligned to `cpm-engine` v2.9.32. Framework citations verified at top-level (Canada Labour Code, 5 U.S.C. § 6103); provincial / state framework names are reference-level pointers and should be reconciled to current statute by the analyst per the [Forensic-use guidance](#forensic-use-guidance) above.*
