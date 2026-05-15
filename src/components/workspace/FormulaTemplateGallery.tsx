"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type FormulaTemplateGalleryItem = {
  id: string;
  name: string;
  description: string;
  scope: string;
  expression: string;
  outputType: string;
  installed: boolean;
  preview: {
    value: unknown;
    error: string | null;
  };
};

export function FormulaTemplateGallery({
  templates,
  workspaceId
}: {
  templates: FormulaTemplateGalleryItem[];
  workspaceId?: string;
}) {
  const router = useRouter();
  const [busyTemplateId, setBusyTemplateId] = useState("");
  const [notice, setNotice] = useState("");

  async function addTemplate(templateId: string) {
    if (!workspaceId) {
      setNotice("Create a workspace before adding formula templates.");
      return;
    }

    setBusyTemplateId(templateId);

    try {
      const response = await fetch("/api/formulas/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, templateId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to add formula template.");
      }
      setNotice(
        `${result.column.name} added and evaluated across ${result.results.length} existing rows.`
      );
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyTemplateId("");
    }
  }

  return (
    <section className="template-gallery">
      <div className="section-heading">
        <div>
          <h2>Formula Template Gallery</h2>
          <p>Preview a template on a sample row, then add it as a workspace formula column.</p>
        </div>
      </div>
      <div className="template-grid">
        {templates.map((template) => (
          <article className="template-card" key={template.id}>
            <div>
              <div className="template-meta">
                <span>{formatEnum(template.scope)}</span>
                <span>{formatEnum(template.outputType)}</span>
              </div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
            </div>
            <div className="template-preview">
              <span>Sample result</span>
              <strong>
                {template.preview.error
                  ? template.preview.error
                  : formatPreviewValue(template.preview.value)}
              </strong>
            </div>
            <code>{template.expression}</code>
            <button
              disabled={template.installed || busyTemplateId === template.id}
              onClick={() => addTemplate(template.id)}
              type="button"
            >
              {template.installed
                ? "Added"
                : busyTemplateId === template.id
                  ? "Adding..."
                  : "Add to workspace"}
            </button>
          </article>
        ))}
      </div>
      {notice ? <p className="table-notice">{notice}</p> : null}
    </section>
  );
}

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "No value";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
