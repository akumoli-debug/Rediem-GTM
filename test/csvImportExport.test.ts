import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCsv, parseCsv } from "../src/server/exports/csv";
import { normalizeDomain, previewAccountsCsv } from "../src/server/imports/accountsCsv";

test("parses quoted CSV cells", () => {
  const rows = parseCsv('domain,notes\nlinear.app,"A, B, and C"\n');

  assert.deepEqual(rows, [
    {
      domain: "linear.app",
      notes: "A, B, and C"
    }
  ]);
});

test("normalizes company website URLs to domains", () => {
  const result = normalizeDomain("https://www.example.com/pricing");

  assert.deepEqual(result, {
    ok: true,
    domain: "example.com"
  });
});

test("rejects malformed domains", () => {
  const result = normalizeDomain("localhost");

  assert.equal(result.ok, false);
});

test("previews account CSV with required domain or company website", () => {
  const preview = previewAccountsCsv(
    [
      "company website,companyName,industry",
      "https://www.linear.app,Linear,Software",
      ",Missing Domain,Software"
    ].join("\n")
  );

  assert.equal(preview[0].status, "VALID");
  assert.equal(preview[0].domain, "linear.app");
  assert.equal(preview[1].status, "INVALID");
});

test("detects file and workspace duplicates", () => {
  const preview = previewAccountsCsv(
    ["domain,companyName", "linear.app,Linear", "linear.app,Linear Copy", "vercel.com,Vercel"].join(
      "\n"
    ),
    ["vercel.com"]
  );

  assert.equal(preview[0].status, "VALID");
  assert.equal(preview[1].status, "DUPLICATE_FILE");
  assert.equal(preview[2].status, "DUPLICATE_WORKSPACE");
});

test("builds CSV with formula columns", () => {
  const csv = buildCsv([
    {
      domain: "linear.app",
      name: "Linear",
      "formula:Account Fit Score": "84"
    }
  ]);

  assert.match(csv, /formula:Account Fit Score/);
  assert.match(csv, /linear\.app/);
});

