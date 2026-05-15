import { extractDependencies } from "./dependencies";
import { formulaFunctions, isTruthy, toNumber } from "./functions";
import { parseFormula } from "./parser";
import {
  FormulaError,
  type FormulaAstNode,
  type FormulaContext,
  type FormulaEvaluation,
  type FormulaValue
} from "./types";

export function evaluateFormula(
  expression: string,
  context: FormulaContext,
  options: { now?: Date } = {}
): FormulaEvaluation {
  const ast = parseFormula(expression);
  return {
    value: evaluateAst(ast, context, { now: options.now ?? new Date() }),
    dependencies: extractDependencies(ast)
  };
}

export function evaluateAst(
  node: FormulaAstNode,
  context: FormulaContext,
  options: { now: Date }
): FormulaValue {
  if (node.type === "Literal") {
    return node.value;
  }

  if (node.type === "Field") {
    return resolveField(node.path, context);
  }

  if (node.type === "Unary") {
    const value = evaluateAst(node.argument, context, options);
    return node.operator === "NOT"
      ? !isTruthy(value)
      : -toNumber(value, "Unary minus");
  }

  if (node.type === "Binary") {
    const left = evaluateAst(node.left, context, options);

    if (node.operator === "AND") {
      return isTruthy(left) && isTruthy(evaluateAst(node.right, context, options));
    }

    if (node.operator === "OR") {
      return isTruthy(left) || isTruthy(evaluateAst(node.right, context, options));
    }

    const right = evaluateAst(node.right, context, options);
    return evaluateBinary(node.operator, left, right);
  }

  const fn = formulaFunctions[node.name];

  if (!fn) {
    throw new FormulaError(`Unsupported function '${node.name}'`);
  }

  return fn(
    node.args.map((arg) => evaluateAst(arg, context, options)),
    options
  );
}

function resolveField(path: string, context: FormulaContext): FormulaValue {
  const [entity, field] = path.split(".") as [
    keyof FormulaContext,
    string
  ];
  const entityContext = context[entity];

  if (!entityContext || !(field in entityContext)) {
    return null;
  }

  return entityContext[field] ?? null;
}

function evaluateBinary(
  operator: string,
  left: FormulaValue,
  right: FormulaValue
): FormulaValue {
  switch (operator) {
    case "=":
      return compareValues(left, right) === 0;
    case "!=":
      return compareValues(left, right) !== 0;
    case ">":
      return compareValues(left, right) > 0;
    case ">=":
      return compareValues(left, right) >= 0;
    case "<":
      return compareValues(left, right) < 0;
    case "<=":
      return compareValues(left, right) <= 0;
    case "+":
      return toNumber(left, "Addition left") + toNumber(right, "Addition right");
    case "-":
      return toNumber(left, "Subtraction left") - toNumber(right, "Subtraction right");
    case "*":
      return toNumber(left, "Multiplication left") * toNumber(right, "Multiplication right");
    case "/": {
      const divisor = toNumber(right, "Division right");
      if (divisor === 0) {
        throw new FormulaError("Division by zero");
      }
      return toNumber(left, "Division left") / divisor;
    }
    default:
      throw new FormulaError(`Unsupported operator '${operator}'`);
  }
}

function compareValues(left: FormulaValue, right: FormulaValue): number {
  if (typeof left === "number" || typeof right === "number") {
    return toNumber(left, "Comparison left") - toNumber(right, "Comparison right");
  }

  if (left instanceof Date || right instanceof Date) {
    const leftDate = left instanceof Date ? left : new Date(String(left));
    const rightDate = right instanceof Date ? right : new Date(String(right));
    return leftDate.getTime() - rightDate.getTime();
  }

  return String(left ?? "").localeCompare(String(right ?? ""));
}
