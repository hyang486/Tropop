// Web only (metro.config.js swaps this in for 'expo-file-system'). The real module is a no-op on web, so the upload
// path (File.exists / size / createUploadTask) failed. This keeps the same API surface the app uses, backed by
// blob:/data: URIs. Sizes are sync in the app, so every URL.createObjectURL blob is remembered here.

const sizes = new Map<string, number>();

if (typeof URL !== 'undefined' && !(URL as unknown as { __sized?: boolean }).__sized) {
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const url = create(obj);
    if (obj instanceof Blob) sizes.set(url, obj.size);
    return url;
  };
  (URL as unknown as { __sized?: boolean }).__sized = true;
}

function dataUriSize(uri: string): number {
  const comma = uri.indexOf(',');
  if (!uri.startsWith('data:') || comma < 0) return 0;
  const body = uri.slice(comma + 1);
  if (!uri.slice(0, comma).includes(';base64')) return decodeURIComponent(body).length;
  const pad = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - pad;
}

/** Tell the stub a blob's size (for blob URLs created before this module loaded). */
export function rememberBlobSize(uri: string, size: number) {
  sizes.set(uri, size);
}

export class Directory {
  uri: string;
  name: string;
  exists = false;
  constructor(...parts: (string | Directory)[]) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    this.name = this.uri.split('/').pop() ?? '';
  }
  create() {}
  delete() {}
  list(): (File | Directory)[] {
    return [];
  }
}

export const Paths = { cache: new Directory('web-cache'), document: new Directory('web-document') };

type UploadOptions = {
  httpMethod?: string;
  headers?: Record<string, string>;
  onProgress?: (p: { bytesSent: number; totalBytes: number }) => void;
  signal?: AbortSignal;
};

export class File {
  uri: string;
  constructor(...parts: (string | Directory | File)[]) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  get type() {
    return '';
  }
  get exists() {
    return sizes.has(this.uri) || this.uri.startsWith('data:') || this.uri.startsWith('blob:');
  }
  get size() {
    return sizes.get(this.uri) ?? dataUriSize(this.uri);
  }
  delete() {
    sizes.delete(this.uri);
  }
  async arrayBuffer() {
    return (await fetch(this.uri)).arrayBuffer();
  }
  createUploadTask(url: string, options: UploadOptions = {}) {
    const uri = this.uri;
    return {
      uploadAsync: async () => {
        const blob = await (await fetch(uri)).blob();
        return new Promise<{ status: number; body: string; headers: Record<string, string> }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(options.httpMethod ?? 'POST', url);
          for (const [k, v] of Object.entries(options.headers ?? {})) xhr.setRequestHeader(k, v);
          xhr.upload.onprogress = (e) => options.onProgress?.({ bytesSent: e.loaded, totalBytes: e.total || blob.size });
          xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText, headers: {} });
          xhr.onerror = () => reject(new Error('Upload failed (network)'));
          options.signal?.addEventListener('abort', () => {
            xhr.abort();
            reject(new Error('Aborted'));
          });
          xhr.send(blob);
        });
      },
    };
  }
  static async pickFileAsync(): Promise<File | File[] | null> {
    return null;
  }
  static async downloadFileAsync(url: string, _dest: File | Directory, options?: { headers?: Record<string, string> }) {
    const res = await fetch(url, { headers: options?.headers });
    const blob = await res.blob();
    const uri = URL.createObjectURL(blob);
    return new File(uri);
  }
  static createDownloadTask(url: string, _dest: File | Directory, options?: { headers?: Record<string, string> }) {
    return { downloadAsync: () => File.downloadFileAsync(url, _dest, options) };
  }
}
