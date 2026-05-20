import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { generateBenchmarkReport } from "../src/server/reports/generateBenchmarkReport";

type CliArgs = {
  input?: string;
  output?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input) {
    throw new Error("Missing required --input argument.");
  }

  if (!args.output) {
    throw new Error("Missing required --output argument.");
  }

  const raw = await readFile(args.input, "utf8");
  const benchmark = JSON.parse(raw) as unknown;
  const markdown = generateBenchmarkReport(benchmark as never);

  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, `${markdown.trimEnd()}\n`, "utf8");
  console.log(`Wrote Rediem benchmark report to ${args.output}`);
}

function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--input") {
      parsed.input = next;
      index += 1;
    } else if (arg === "--output") {
      parsed.output = next;
      index += 1;
    }
  }

  return parsed;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
