import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import {
  FeedbackReasonChip,
  PackId,
  getFeedbackForTarget,
  recordUserFeedback,
} from '../../analytics';

const REASON_CHIPS: FeedbackReasonChip[] = [
  'wrong column',
  'wrong formula',
  'not useful',
  'confusing',
];

export interface FeedbackThumbsBarProps {
  targetType: 'pack' | 'insight' | 'chart' | 'slide';
  targetId: string;
  columnNames: string[];
  packId?: PackId;
  compact?: boolean;
  label?: string;
  onFeedbackRecorded?: (
    sentiment: 'up' | 'down',
    reason?: FeedbackReasonChip
  ) => void;
}

export const FeedbackThumbsBar: React.FC<FeedbackThumbsBarProps> = ({
  targetType,
  targetId,
  columnNames,
  packId,
  compact = false,
  label,
  onFeedbackRecorded,
}) => {
  const [sentiment, setSentiment] = useState<'up' | 'down' | null>(null);
  const [selectedReason, setSelectedReason] = useState<
    FeedbackReasonChip | undefined
  >(undefined);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(() => {
    const existing = getFeedbackForTarget(
      targetType,
      targetId,
      columnNames,
      packId
    );
    setSentiment(existing?.sentiment || null);
    setSelectedReason(existing?.reason);
    setShowReasons(false);
  }, [targetType, targetId, columnNames, packId]);

  const handleVote = (vote: 'up' | 'down') => {
    setSentiment(vote);
    recordUserFeedback({
      targetType,
      targetId,
      columnNames,
      packId,
      sentiment: vote,
      reason: vote === 'down' ? selectedReason : undefined,
    });
    if (vote === 'down') {
      setShowReasons(true);
    } else {
      setShowReasons(false);
      setSelectedReason(undefined);
    }
    onFeedbackRecorded?.(vote, vote === 'down' ? selectedReason : undefined);
  };

  const handleSelectReason = (reason: FeedbackReasonChip) => {
    setSelectedReason(reason);
    setShowReasons(false);
    recordUserFeedback({
      targetType,
      targetId,
      columnNames,
      packId,
      sentiment: 'down',
      reason,
    });
    onFeedbackRecorded?.('down', reason);
  };

  return (
    <div
      data-testid={`feedback-bar-${targetType}-${targetId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex flex-wrap items-center gap-1.5"
    >
      {label && (
        <span className="text-[10px] font-mono text-muted">{label}</span>
      )}
      <button
        type="button"
        data-testid={`feedback-up-${targetType}-${targetId}`}
        onClick={() => handleVote('up')}
        aria-label={`Helpful ${targetType}`}
        title="Helpful — learn this preference"
        className={`inline-flex items-center gap-1 rounded-lg border transition-colors cursor-pointer ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
        } ${
          sentiment === 'up'
            ? 'bg-accent-soft text-accent border-strong font-semibold'
            : 'bg-elevated hover:bg-card-hover text-muted hover:text-primary border-subtle'
        }`}
      >
        <ThumbsUp className="w-3 h-3" />
        {!compact && <span>Helpful</span>}
      </button>

      <button
        type="button"
        data-testid={`feedback-down-${targetType}-${targetId}`}
        onClick={() => handleVote('down')}
        aria-label={`Not helpful ${targetType}`}
        title="Not helpful — tell us why to adapt"
        className={`inline-flex items-center gap-1 rounded-lg border transition-colors cursor-pointer ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
        } ${
          sentiment === 'down'
            ? 'bg-card text-danger border-strong font-semibold'
            : 'bg-elevated hover:bg-card-hover text-muted hover:text-primary border-subtle'
        }`}
      >
        <ThumbsDown className="w-3 h-3" />
        {!compact && <span>Adapt</span>}
      </button>

      {sentiment === 'down' && selectedReason && !showReasons && (
        <button
          type="button"
          onClick={() => setShowReasons(true)}
          data-testid={`feedback-reason-badge-${targetType}-${targetId}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-elevated text-secondary border border-subtle text-[10px] font-mono cursor-pointer"
        >
          <Check className="w-2.5 h-2.5 text-accent" />
          <span>{selectedReason}</span>
        </button>
      )}

      {showReasons && (
        <div
          data-testid={`feedback-reason-chips-${targetType}-${targetId}`}
          className="flex flex-wrap items-center gap-1 pl-1"
        >
          {REASON_CHIPS.map((reason) => (
            <button
              key={reason}
              type="button"
              data-testid={`feedback-chip-${targetType}-${targetId}-${reason.replace(/\s+/g, '-')}`}
              onClick={() => handleSelectReason(reason)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-colors cursor-pointer ${
                selectedReason === reason
                  ? 'bg-accent-soft text-accent border-strong font-semibold'
                  : 'bg-card hover:bg-card-hover text-secondary border-subtle'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
