'use client';
import { useState } from 'react';
import { Check, Link2, Trash2 } from 'lucide-react';

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      .writeText(link)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })
      .catch(() => prompt('Copy the invite link', link));
  return (
    <button type="button" onClick={copy} className="btn btn-ghost btn-sm">
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />} {copied ? 'Copied' : 'Copy link'}
    </button>
  );
}

// Lives inside a <form action={removeGuest}>; asks before submitting.
export function RemoveButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      onClick={e => { if (!confirm(`Remove ${name}? Their RSVP, wishes and photos will be removed.`)) e.preventDefault(); }}
      className="btn btn-sm text-red-800 hover:bg-red-50"
      aria-label={`Remove ${name}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
