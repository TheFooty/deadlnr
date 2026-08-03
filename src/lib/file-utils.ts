import { TaskAttachment } from './types';

/**
 * Preview file attachment in a new browser tab (PDFs, Images, Text, Docs)
 */
export function previewFile(att: TaskAttachment) {
  if (typeof window === 'undefined') return;

  try {
    if (att.dataUrl.includes(';base64,')) {
      const parts = att.dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'application/octet-stream';
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    }
    window.open(att.dataUrl, '_blank');
  } catch (err) {
    const win = window.open('about:blank', '_blank');
    if (win) {
      win.document.write(`
        <! elimination>
        <html>
          <head><title>${att.name}</title></head>
          <body style="margin:0; background:#080a0f; display:flex; align-items:center; justify-center; height:100vh;">
            <iframe src="${att.dataUrl}" style="width:100%; height:100%; border:none;"></iframe>
          </body>
        </html>
      `);
    }
  }
}
