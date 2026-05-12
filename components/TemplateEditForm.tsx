"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

type Tab = "subject" | "html" | "text" | "preview";

interface Props {
  templateId:     string;
  initialSubject: string;
  initialHtml:    string;
  initialText:    string;
}

export function TemplateEditForm({ templateId, initialSubject, initialHtml, initialText }: Props) {
  const [tab,         setTab]         = useState<Tab>("subject");
  const [subject,     setSubject]     = useState(initialSubject);
  const [html,        setHtml]        = useState(initialHtml);
  const [text,        setText]        = useState(initialText);
  const [previewHtml, setPreviewHtml] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  async function loadPreview() {
    setLoading(true);
    setTab("preview");
    try {
      const res  = await fetch("/api/templates/render-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectTemplate: subject, bodyHtmlTemplate: html, bodyTextTemplate: text })
      });
      const data = await res.json();
      setPreviewHtml(data.html ?? "<p>Preview failed.</p>");
    } catch {
      setPreviewHtml("<p style='color:red'>Preview error.</p>");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res  = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectTemplate: subject, bodyHtmlTemplate: html, bodyTextTemplate: text })
      });
      const data = await res.json();
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else         setError(data.error ?? "Save failed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "subject", label: "Subject" },
    { id: "html",    label: "HTML Body" },
    { id: "text",    label: "Plain Text" },
    { id: "preview", label: "Preview" }
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => t.id === "preview" ? loadPreview() : setTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
              tab === t.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Subject */}
      {tab === "subject" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Email Subject Line</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            placeholder="Email subject..."
          />
          <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
            <p className="text-xs font-bold text-cyan-900 mb-1">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {["{{app_name}}", "{{incident_type}}", "{{title}}", "{{stage}}", "{{status_color}}"].map(v => (
                <code key={v} className="rounded bg-white border border-cyan-200 px-1.5 py-0.5 text-[10px] font-mono text-cyan-800">{v}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HTML Body */}
      {tab === "html" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">HTML Email Body</label>
          <textarea
            value={html}
            onChange={e => setHtml(e.target.value)}
            rows={18}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs leading-5 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
      )}

      {/* Plain Text */}
      {tab === "text" && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Plain Text Body</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={18}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs leading-5 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />
        </div>
      )}

      {/* Preview */}
      {tab === "preview" && (
        <div className="min-h-64 rounded-xl border border-slate-200 bg-white p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-slate-400 text-sm">
              <Icon name="pending" className="text-[20px]" />
              Rendering preview...
            </div>
          ) : previewHtml ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rendered Preview</p>
                <button type="button" onClick={loadPreview} className="text-xs font-bold text-cyan-700 hover:text-cyan-900">Refresh</button>
              </div>
              <div
                className="prose prose-sm max-w-none rounded-lg border border-slate-100 bg-slate-50 p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading preview...</div>
          )}
        </div>
      )}

      {/* Save controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-50 active:scale-95"
        >
          {saving ? <><Icon name="pending" className="text-[16px]" />Saving...</> : <><Icon name="check" className="text-[16px]" />Save Changes</>}
        </button>
        {saved  && <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Icon name="check_circle" className="text-[16px]" />Saved!</span>}
        {error  && <span className="text-sm font-bold text-red-600">{error}</span>}
      </div>
    </div>
  );
}
