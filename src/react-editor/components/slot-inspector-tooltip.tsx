'use client';

import { useId, useState } from 'react';
import { SlotResponse } from '../../core';

interface SlotInspectorTooltipProps {
  source?: SlotResponse['source'];
  activeContext?: Record<string, string>;
}

function formatMatchValue(match: NonNullable<SlotResponse['source']>['matchedContexts'][number]) {
  if (match.type === 'none') {
    return 'Unset';
  }

  if (match.type === 'all') {
    return match.value || 'Any value';
  }

  return match.value || 'Exact';
}

export function SlotInspectorTooltip(props: SlotInspectorTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const activeEntries = Object.entries(props.activeContext || {});

  return (
    <div
      className="slot-inspector"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="slot-inspector__button"
        aria-label="Inspect slot source"
        aria-describedby={open ? tooltipId : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
      >
        <svg
          className="slot-inspector__icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          width="18"
          height="18"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M480-680q17 0 28.5-11.5T520-720q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720q0 17 11.5 28.5T480-680Zm-40 400h80v-240h-80v240Zm40 200q-83 0-156-31.5t-127.5-86Q142-252 110.5-325T79-480q0-83 31.5-156t86-127.5Q252-818 325-849.5T480-881q83 0 156 31.5t127.5 86Q818-708 849.5-635T881-480q0 83-31.5 156t-86 127.5Q708-142 635-110.5T480-79Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
        </svg>
      </button>

      {open ? (
        <div id={tooltipId} role="tooltip" className="slot-inspector__tooltip">
          {props.source ? (
            <>
              <div className="slot-inspector__section">
                <div className="slot-inspector__label">File</div>
                <code className="slot-inspector__code">{props.source.filePath}</code>
              </div>

              {props.source.embeddedIn ? (
                <p className="slot-inspector__note">
                  Nested slot <code>{props.source.embeddedIn.slotId}</code> inside block{' '}
                  <code>{props.source.embeddedIn.blockId}</code>.
                </p>
              ) : null}

              <div className="slot-inspector__section">
                <div className="slot-inspector__label">Matched by</div>
                {props.source.matchedContexts.length ? (
                  <dl className="slot-inspector__list">
                    {props.source.matchedContexts.map((match) => (
                      <div
                        key={`${match.id}:${match.type}:${match.value || ''}`}
                        className="slot-inspector__row"
                      >
                        <dt>{match.id}</dt>
                        <dd>{formatMatchValue(match)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="slot-inspector__empty">Default file match</p>
                )}
              </div>
            </>
          ) : (
            <p className="slot-inspector__note">Source file unavailable for this loader.</p>
          )}

          <div className="slot-inspector__section">
            <div className="slot-inspector__label">Active context</div>
            {activeEntries.length ? (
              <dl className="slot-inspector__list">
                {activeEntries.map(([key, value]) => (
                  <div key={key} className="slot-inspector__row">
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="slot-inspector__empty">No active contexts</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
