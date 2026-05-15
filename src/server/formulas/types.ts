export type FormulaScope = "ACCOUNT" | "PERSON";

export type FormulaOutputType = "STRING" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON";

export type FormulaPrimitive = string | number | boolean | null;

export type FormulaValue =
  | FormulaPrimitive
  | Date
  | FormulaValue[]
  | { [key: string]: FormulaValue };

export type FormulaContext = {
  account?: Record<string, FormulaValue | undefined>;
  brand?: Record<string, FormulaValue | undefined>;
  person?: Record<string, FormulaValue | undefined>;
  signal?: Record<string, FormulaValue | undefined>;
};

export type FormulaDependency = {
  entity: "account" | "brand" | "person" | "signal";
  field: string;
  path: string;
};

export type FormulaEvaluation = {
  value: FormulaValue;
  dependencies: FormulaDependency[];
};

export type FormulaTokenType =
  | "number"
  | "string"
  | "identifier"
  | "field"
  | "operator"
  | "paren"
  | "comma"
  | "eof";

export type FormulaToken = {
  type: FormulaTokenType;
  value: string;
  position: number;
};

export type FormulaAstNode =
  | LiteralNode
  | FieldNode
  | UnaryNode
  | BinaryNode
  | FunctionCallNode;

export type LiteralNode = {
  type: "Literal";
  value: FormulaValue;
};

export type FieldNode = {
  type: "Field";
  path: string;
};

export type UnaryNode = {
  type: "Unary";
  operator: "NOT" | "-";
  argument: FormulaAstNode;
};

export type BinaryNode = {
  type: "Binary";
  operator: "=" | "!=" | ">" | ">=" | "<" | "<=" | "+" | "-" | "*" | "/" | "AND" | "OR";
  left: FormulaAstNode;
  right: FormulaAstNode;
};

export type FunctionCallNode = {
  type: "FunctionCall";
  name: string;
  args: FormulaAstNode[];
};

export class FormulaError extends Error {
  position?: number;

  constructor(message: string, position?: number) {
    super(position === undefined ? message : `${message} at position ${position}`);
    this.name = "FormulaError";
    this.position = position;
  }
}
