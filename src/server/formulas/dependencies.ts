import type { FormulaAstNode, FormulaDependency } from "./types";

export function extractDependencies(ast: FormulaAstNode): FormulaDependency[] {
  const seen = new Map<string, FormulaDependency>();

  visit(ast, (node) => {
    if (node.type !== "Field") {
      return;
    }

    const [entity, field] = node.path.split(".") as [
      FormulaDependency["entity"],
      string
    ];
    seen.set(node.path, {
      entity,
      field,
      path: node.path
    });
  });

  return [...seen.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function visit(
  node: FormulaAstNode,
  visitor: (node: FormulaAstNode) => void
): void {
  visitor(node);

  if (node.type === "Unary") {
    visit(node.argument, visitor);
  } else if (node.type === "Binary") {
    visit(node.left, visitor);
    visit(node.right, visitor);
  } else if (node.type === "FunctionCall") {
    for (const arg of node.args) {
      visit(arg, visitor);
    }
  }
}
