import jsPDF from "jspdf";
import type { Msg } from "./types";
import { envleFileName } from "./history";

export function exportChatTxt(title: string, messages: Msg[]) {
  const body = messages
    .map((m) => `[${m.role === "user" ? "Moi" : "E'nvlé AI"}]\n${m.content}\n`)
    .join("\n");
  const blob = new Blob([`E'nvlé AI — ${title}\n\n${body}`], {
    type: "text/plain;charset=utf-8",
  });
  triggerDownload(blob, envleFileName(title, "txt"));
}

export function exportChatPdf(title: string, messages: Msg[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`E'nvlé AI — ${title}`, margin, y);
  y += 24;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString("fr-FR"), margin, y);
  y += 20;
  doc.setTextColor(0);

  for (const m of messages) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(m.role === "user" ? "Moi" : "E'nvlé AI", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(m.content, width);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 13;
    }
    y += 10;
  }

  doc.save(envleFileName(title, "pdf"));
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}