export type Msg = { role: "user" | "assistant"; content: string };

export type GeneratedAsset = {
  id: string;
  kind: "image" | "document";
  format: string; // png, pdf, docx, pptx
  name: string;
  dataUrl: string; // for image/* or application/* as data URL
  createdAt: number;
};