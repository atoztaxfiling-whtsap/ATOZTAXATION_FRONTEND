export interface Thread { mobile: string; name?: string; lastMessage?: string; timestamp?: string; unread?: number; }
export interface BackendMessage { from: 'user' | 'bot'; text: string; time: string; }
export interface FlatMessage { id: string; text: string; sender: 'me' | 'other'; timestamp: string; status?: 'sent' | 'delivered' | 'read' | 'failed'; statusError?: string; replyToId?: string; isBot?: boolean; }
export interface AttachmentPreview { file: File; url: string; type: 'image' | 'document'; }

export function getAvatarColor(name: string): string {
  const colors = ['#f44336','#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#00bcd4','#009688','#4caf50','#ff9800','#ff5722','#795548','#607d8b','#e64a19','#1976d2'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function getInitials(name: string): string {
  const t = name.trim(); if (!t) return '??';
  const w = t.split(/\s+/);
  return w.length === 1 ? w[0].slice(0, 2).toUpperCase() : (w[0][0] + w[w.length - 1][0]).toUpperCase();
}
