import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SkeletonList } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import HeroBanner from '../components/dashboard/HeroBanner';
import { useAuth } from '../context/AuthContext';
import {
  listMyThreads,
  listMessages,
  sendMessage,
  markThreadRead,
} from '../services/message.service';

// Poll interval while the conversation is open. Slow enough that a
// two-way chat doesn't hammer the API, fast enough that a reply lands
// visibly. Real-time is a v2 concern.
const POLL_MS = 15000;

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function ThreadListItem({ thread, active, onOpen }) {
  const other = thread.other;
  return (
    <button
      onClick={() => onOpen(thread.id)}
      className={`w-full text-left rounded-lg p-3 border transition-colors ${
        active
          ? 'bg-primary/5 border-primary/30'
          : 'bg-white border-border hover:border-primary/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full shrink-0 text-white font-bold text-xs flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
        >
          {initialsOf(other?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-text-light truncate text-sm">
              {other?.name || 'Unknown'}
            </div>
            <div className="text-[10px] text-text-muted shrink-0">
              {relativeTime(thread.lastMessageAt)}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="text-xs text-text-muted truncate">
              {thread.lastMessageBody || 'No messages yet'}
            </div>
            {thread.unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold px-1 shrink-0">
                {thread.unread > 99 ? '99+' : thread.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function Bubble({ msg, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          mine
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-muted text-text-light rounded-bl-sm'
        }`}
      >
        {msg.body}
        <div
          className={`text-[10px] mt-1 ${
            mine ? 'text-white/70' : 'text-text-muted'
          }`}
        >
          {new Date(msg.createdAt).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

function ConversationView({ threadId, thread, viewerId, onBack, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // Server-populated "other participant" — used when the thread is
  // opened directly by URL (?thread=<id>) before the sidebar list has
  // loaded, e.g. clicking Message on a My-Network card and landing here
  // before ever sending anything.
  const [otherFromServer, setOtherFromServer] = useState(null);
  const bottomRef = useRef(null);

  const other = otherFromServer || thread?.other;
  const otherId = other?.id;

  const scrollToBottom = () => {
    // rAF so DOM has painted the new message before we scroll.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const load = async ({ silent } = {}) => {
    if (!threadId) return;
    if (!silent) setLoading(true);
    try {
      const result = await listMessages(threadId);
      setMessages(result.messages || []);
      if (result.other) setOtherFromServer(result.other);
      if (!silent) scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!threadId) return () => {};
    load();
    markThreadRead(threadId).catch(() => {
      /* non-fatal */
    });
    const t = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const submit = async e => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !otherId) return;
    setSending(true);
    setError('');
    // Optimistic append so the sender's own message shows up immediately.
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      threadId,
      fromFacultyId: viewerId,
      toFacultyId: otherId,
      body,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    scrollToBottom();
    try {
      const saved = await sendMessage({ toFacultyId: otherId, body });
      setMessages(prev =>
        prev.map(m => (m.id === optimistic.id ? { ...saved, _mine: true } : m)),
      );
      onSent?.(saved);
    } catch (err) {
      // Rollback the optimistic append and surface the error.
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setDraft(body);
      setError(err.response?.data?.error?.message || 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-md text-text-muted hover:bg-muted"
          aria-label="Back to threads"
        >
          <ArrowLeft size={16} />
        </button>
        <div
          className="w-9 h-9 rounded-full shrink-0 text-white font-bold text-xs flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
        >
          {initialsOf(other?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-text-light truncate">{other?.name || 'Conversation'}</div>
          {other?.designation && (
            <div className="text-[11px] text-text-muted truncate">
              {other.designation === 'Professor'
                ? 'Professor'
                : `${other.designation} Professor`}
              {other.department ? ` · ${other.department}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-dark/40">
        {loading && (
          <div className="flex items-center justify-center py-8 text-text-muted text-sm">
            <Loader2 size={16} className="animate-spin mr-2" /> Loading…
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-xs text-text-muted italic py-8">
            No messages yet. Say hi.
          </div>
        )}
        {messages.map(m => (
          <Bubble key={m.id} msg={m} mine={String(m.fromFacultyId) === String(viewerId)} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 pt-2">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={submit} className="p-3 border-t border-border flex items-end gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            // Cmd/Ctrl + Enter sends; plain Enter inserts a newline so
            // multi-paragraph messages compose naturally on desktop.
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(e);
            }
          }}
          rows={2}
          maxLength={5000}
          placeholder="Type a message… (Ctrl+Enter to send)"
          className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
          <Send size={13} className="mr-1" />
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeThreadId = searchParams.get('thread') || null;

  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const result = await listMyThreads();
      setThreads(result);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh thread list every ~30s so the unread badge + last-preview
    // stay fresh while the tab is open.
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const openThread = id => {
    setSearchParams({ thread: id });
    // Optimistically zero the unread badge on the sidebar row.
    setThreads(prev => prev.map(t => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const closeThread = () => {
    setSearchParams({});
  };

  const activeThread = useMemo(
    () => threads.find(t => t.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const stats = useMemo(() => {
    const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);
    return [
      { icon: <MessageSquare size={18} />, value: threads.length, label: 'Conversations' },
      { icon: <MessageSquare size={18} />, value: totalUnread, label: 'Unread' },
    ];
  }, [threads]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <HeroBanner
        title="Messages"
        subtitle="On-platform conversations with faculty who have accepted your connect request."
        icon={<MessageSquare strokeWidth={1.4} />}
        stats={stats}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <SkeletonList count={3} cardLines={2} />}

      {/* Empty state: no threads AND no thread id in the URL. When the
          URL carries ?thread=<id> we always fall through to the split
          view so a freshly-opened conversation (thread exists on the
          server but hasn't been used yet, so listMyThreads filters it)
          still renders correctly. */}
      {!loading && threads.length === 0 && !activeThreadId && (
        <EmptyState
          icon={<MessageSquare size={20} />}
          title="No conversations yet"
          description="Once someone accepts your connect request, you can start a conversation with them from your Requests page or their directory profile."
          action={
            <Button size="sm" onClick={() => navigate('/requests')}>
              Go to connect requests
            </Button>
          }
        />
      )}

      {!loading && (threads.length > 0 || activeThreadId) && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className={`space-y-2 ${activeThreadId ? 'hidden lg:block' : ''}`}>
            {threads.length === 0 ? (
              <div className="text-xs text-text-muted italic p-3 rounded-lg border border-dashed border-border">
                No prior conversations. Send your first message on the right
                to start this one.
              </div>
            ) : (
              threads.map(t => (
                <ThreadListItem
                  key={t.id}
                  thread={t}
                  active={t.id === activeThreadId}
                  onOpen={openThread}
                />
              ))
            )}
          </div>
          <div className={activeThreadId ? '' : 'hidden lg:flex lg:items-center lg:justify-center'}>
            {activeThreadId ? (
              <ConversationView
                threadId={activeThreadId}
                thread={activeThread}
                viewerId={user?.id}
                onBack={closeThread}
                onSent={load}
              />
            ) : (
              <div className="text-sm text-text-muted italic text-center py-16">
                Pick a conversation on the left to start reading.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
