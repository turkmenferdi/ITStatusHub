"use client";

import { useMemo, useState } from "react";
import { updateStatusPageOrderAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

type ServiceOrderItem = {
  id: string;
  name: string;
  ownerTeam: string;
};

export function StatusPageOrderEditor({ services }: { services: ServiceOrderItem[] }) {
  const [items, setItems] = useState(services);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const orderedIds = useMemo(() => items.map((item) => item.id).join(","), [items]);

  function moveService(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setItems((current) => {
      const dragged = current.find((item) => item.id === draggedId);
      if (!dragged) return current;
      const withoutDragged = current.filter((item) => item.id !== draggedId);
      const targetIndex = withoutDragged.findIndex((item) => item.id === targetId);
      if (targetIndex < 0) return current;
      return [...withoutDragged.slice(0, targetIndex), dragged, ...withoutDragged.slice(targetIndex)];
    });
  }

  return (
    <form action={updateStatusPageOrderAction} className="space-y-3">
      <input type="hidden" name="orderedIds" value={orderedIds} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(event) => {
              event.preventDefault();
              moveService(item.id);
            }}
            onDrop={() => setDraggedId(null)}
            onDragEnd={() => setDraggedId(null)}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm transition active:cursor-grabbing"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-extrabold text-slate-500">{index + 1}</span>
            <span className="text-lg font-extrabold leading-none text-slate-400">::</span>
            <div>
              <p className="text-sm font-extrabold text-slate-950">{item.name}</p>
              <p className="text-xs text-slate-500">{item.ownerTeam}</p>
            </div>
          </div>
        ))}
      </div>
      <SubmitButton>Save status page order</SubmitButton>
    </form>
  );
}
