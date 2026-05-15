import {
  FormulaError,
  type BinaryNode,
  type FormulaAstNode,
  type FormulaToken
} from "./types";

const OPERATORS = new Set(["=", "!=", ">", ">=", "<", "<=", "+", "-", "*", "/"]);

export function parseFormula(expression: string): FormulaAstNode {
  const parser = new Parser(tokenize(expression));
  const ast = parser.parseExpression();
  parser.expect("eof");
  return ast;
}

export function tokenize(expression: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (!char) {
      break;
    }

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === "{") {
      const end = expression.indexOf("}", index + 1);

      if (end === -1) {
        throw new FormulaError("Unclosed field reference", index);
      }

      tokens.push({
        type: "field",
        value: expression.slice(index + 1, end).trim(),
        position: index
      });
      index = end + 1;
      continue;
    }

    if (char === '"') {
      const { value, nextIndex } = readString(expression, index);
      tokens.push({ type: "string", value, position: index });
      index = nextIndex;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      const match = expression.slice(index).match(/^\d+(?:\.\d+)?/);

      if (!match) {
        throw new FormulaError("Invalid number", index);
      }

      tokens.push({ type: "number", value: match[0], position: index });
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      const value = match?.[0] ?? "";
      const upper = value.toUpperCase();

      tokens.push({
        type: upper === "AND" || upper === "OR" || upper === "NOT" ? "operator" : "identifier",
        value: upper === "AND" || upper === "OR" || upper === "NOT" ? upper : value,
        position: index
      });
      index += value.length;
      continue;
    }

    const twoChar = expression.slice(index, index + 2);

    if (OPERATORS.has(twoChar)) {
      tokens.push({ type: "operator", value: twoChar, position: index });
      index += 2;
      continue;
    }

    if (OPERATORS.has(char)) {
      tokens.push({ type: "operator", value: char, position: index });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char, position: index });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char, position: index });
      index += 1;
      continue;
    }

    throw new FormulaError(`Unexpected character '${char}'`, index);
  }

  tokens.push({ type: "eof", value: "", position: expression.length });
  return tokens;
}

class Parser {
  private index = 0;

  constructor(private tokens: FormulaToken[]) {}

  parseExpression(): FormulaAstNode {
    return this.parseOr();
  }

  expect(type: FormulaToken["type"], value?: string): FormulaToken {
    const token = this.current();

    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new FormulaError(
        `Expected ${value ?? type}, found ${token.value || token.type}`,
        token.position
      );
    }

    this.index += 1;
    return token;
  }

  private parseOr(): FormulaAstNode {
    let node = this.parseAnd();

    while (this.matchOperator("OR")) {
      node = this.binary("OR", node, this.parseAnd());
    }

    return node;
  }

  private parseAnd(): FormulaAstNode {
    let node = this.parseComparison();

    while (this.matchOperator("AND")) {
      node = this.binary("AND", node, this.parseComparison());
    }

    return node;
  }

  private parseComparison(): FormulaAstNode {
    let node = this.parseAdditive();

    while (["=", "!=", ">", ">=", "<", "<="].includes(this.current().value)) {
      const operator = this.current().value as BinaryNode["operator"];
      this.index += 1;
      node = this.binary(operator, node, this.parseAdditive());
    }

    return node;
  }

  private parseAdditive(): FormulaAstNode {
    let node = this.parseMultiplicative();

    while (this.current().value === "+" || this.current().value === "-") {
      const operator = this.current().value as "+" | "-";
      this.index += 1;
      node = this.binary(operator, node, this.parseMultiplicative());
    }

    return node;
  }

  private parseMultiplicative(): FormulaAstNode {
    let node = this.parseUnary();

    while (this.current().value === "*" || this.current().value === "/") {
      const operator = this.current().value as "*" | "/";
      this.index += 1;
      node = this.binary(operator, node, this.parseUnary());
    }

    return node;
  }

  private parseUnary(): FormulaAstNode {
    if (this.matchOperator("NOT")) {
      return { type: "Unary", operator: "NOT", argument: this.parseUnary() };
    }

    if (this.matchOperator("-")) {
      return { type: "Unary", operator: "-", argument: this.parseUnary() };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAstNode {
    const token = this.current();

    if (token.type === "number") {
      this.index += 1;
      return { type: "Literal", value: Number(token.value) };
    }

    if (token.type === "string") {
      this.index += 1;
      return { type: "Literal", value: token.value };
    }

    if (token.type === "field") {
      if (!/^(account|brand|person|signal)\.[A-Za-z][A-Za-z0-9]*$/.test(token.value)) {
        throw new FormulaError(`Invalid field reference {${token.value}}`, token.position);
      }

      this.index += 1;
      return { type: "Field", path: token.value };
    }

    if (token.type === "identifier") {
      const upper = token.value.toUpperCase();

      if (upper === "TRUE" || upper === "FALSE" || upper === "NULL") {
        this.index += 1;
        return {
          type: "Literal",
          value: upper === "NULL" ? null : upper === "TRUE"
        };
      }
    }

    if (
      token.type === "identifier" ||
      (token.type === "operator" &&
        ["AND", "OR", "NOT"].includes(token.value) &&
        this.tokens[this.index + 1]?.type === "paren" &&
        this.tokens[this.index + 1]?.value === "(")
    ) {
      const name = token.value;
      this.index += 1;

      if (this.current().type !== "paren" || this.current().value !== "(") {
        throw new FormulaError(`Unknown identifier '${name}'`, token.position);
      }

      this.expect("paren", "(");
      const args: FormulaAstNode[] = [];

      if (!(this.current().type === "paren" && this.current().value === ")")) {
        do {
          args.push(this.parseExpression());
        } while (this.matchComma());
      }

      this.expect("paren", ")");
      return { type: "FunctionCall", name: name.toUpperCase(), args };
    }

    if (token.type === "paren" && token.value === "(") {
      this.index += 1;
      const node = this.parseExpression();
      this.expect("paren", ")");
      return node;
    }

    throw new FormulaError(`Unexpected token '${token.value || token.type}'`, token.position);
  }

  private binary(
    operator: BinaryNode["operator"],
    left: FormulaAstNode,
    right: FormulaAstNode
  ): FormulaAstNode {
    return { type: "Binary", operator, left, right };
  }

  private matchOperator(value: string): boolean {
    if (this.current().type === "operator" && this.current().value === value) {
      this.index += 1;
      return true;
    }

    return false;
  }

  private matchComma(): boolean {
    if (this.current().type === "comma") {
      this.index += 1;
      return true;
    }

    return false;
  }

  private current(): FormulaToken {
    return this.tokens[this.index] as FormulaToken;
  }
}

function readString(expression: string, start: number): { value: string; nextIndex: number } {
  let value = "";
  let index = start + 1;

  while (index < expression.length) {
    const char = expression[index];

    if (char === "\\") {
      const next = expression[index + 1];

      if (next === '"' || next === "\\" || next === "n") {
        value += next === "n" ? "\n" : next;
        index += 2;
        continue;
      }
    }

    if (char === '"') {
      return { value, nextIndex: index + 1 };
    }

    value += char;
    index += 1;
  }

  throw new FormulaError("Unclosed string literal", start);
}
