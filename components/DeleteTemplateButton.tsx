"use client";

import { Icon } from "@/components/Icon";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  async function handleDelete() {
    if (!window.confirm("Delete this template?")) return;
    await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
    window.location.href = "/templates";
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
    >
      <Icon name="delete_outline" className="text-[16px]" />
      Delete Template
    </button>
  );
}
