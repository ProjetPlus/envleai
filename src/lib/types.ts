export type Msg = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{ kind: "image"; dataUrl: string }> | null;
  createdAt?: string;
};

export type GeneratedAsset = {
  id: string;
  kind: "image" | "document";
  format: string; // png, pdf, docx, pptx
  name: string;
  dataUrl: string; // for image/* or application/* as data URL
  createdAt: number;
};