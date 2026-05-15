# Formulas

Formula columns let users compute account and person fields using safe expressions. The engine parses expressions into an AST and evaluates them against bounded row context. It does not use JavaScript `eval` or `new Function`.

## Scopes

Formula columns have a scope:

- `ACCOUNT`
- `PERSON`

Available field references:

```text
{account.domain}
{account.name}
{account.accountScore}
{account.employeeCount}
{account.careersSummary}
{account.pricingSummary}
{person.fullName}
{person.title}
{person.emailStatus}
{person.roleScore}
{person.contactabilityScore}
{signal.maxScore}
{signal.latestSignalDate}
{signal.types}
```

Signal fields are computed summaries for the related account.

## Operators

Supported operators:

```text
=
!=
>
>=
<
<=
AND
OR
NOT
+ - * /
()
```

String comparison uses quoted strings:

```text
{person.emailStatus} = "VERIFIED"
```

## Functions

Supported functions:

- `IF(condition, trueValue, falseValue)`
- `AND(...)`
- `OR(...)`
- `NOT(value)`
- `CONTAINS(text, search)`
- `LOWER(text)`
- `UPPER(text)`
- `TRIM(text)`
- `CONCAT(...)`
- `COALESCE(...)`
- `REGEX_MATCH(text, pattern)`
- `DAYS_SINCE(date)`
- `DATE_DIFF(date1, date2, unit)`
- `ROUND(number, decimals)`
- `MIN(...)`
- `MAX(...)`
- `AVG(...)`
- `SUM(...)`
- `SCORE(...)`
- `EXISTS(value)`
- `EMPTY(value)`

## Examples

Account tier:

```text
IF({account.accountScore} >= 85, "Tier 1", IF({account.accountScore} >= 65, "Tier 2", "Tier 3"))
```

Outbound ready:

```text
IF(AND({signal.maxScore} >= 70, {account.accountScore} >= 75), "Ready", "Review")
```

Enterprise motion:

```text
IF(OR(CONTAINS(LOWER({account.pricingSummary}), "enterprise"), CONTAINS(LOWER({account.careersSummary}), "enterprise account executive")), true, false)
```

Person sequence status:

```text
IF(AND({person.emailStatus} = "VERIFIED", {person.roleScore} >= 70, {person.contactabilityScore} >= 75), "Sequence", "Manual Review")
```

RevOps buyer:

```text
REGEX_MATCH(LOWER({person.title}), "revops|revenue operations|sales operations|gtm systems")
```

Days since signal:

```text
DAYS_SINCE({signal.latestSignalDate})
```

## Formula Templates

Seeded templates are available in `/settings/formulas`:

- Account Tier
- Outbound Ready
- Enterprise Motion
- Hiring Momentum
- Person Sequence Status
- Founder-Led
- RevOps Buyer
- Days Since Signal

The gallery previews each template on a sample row. Adding a template creates a workspace formula column and evaluates it across existing rows.

## Safety Model

- Expressions are tokenized, parsed, and evaluated by local TypeScript code.
- No JavaScript source is generated or executed.
- No global objects, modules, network access, filesystem access, timers, or process APIs are available to formulas.
- Field references are limited to allowed account, person, and signal paths.
- Invalid syntax, unknown functions, wrong arity, invalid regex patterns, and type mismatches return helpful errors.

## Evaluation Timing

Formulas are evaluated:

- When added from a template.
- When explicitly evaluating one formula or all workspace formulas.
- After account enrichment for account-scoped formulas.
- After person enrichment/contact enrichment for person-scoped formulas.

Formula results are stored as JSON so values can be strings, numbers, booleans, dates, arrays, objects, or null.
