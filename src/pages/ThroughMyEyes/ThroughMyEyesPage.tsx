import { useEffect, useRef } from 'react'
import type { RecipientId } from '../../app/experienceState.ts'
import {
  DEFAULT_MESSAGE_CONTENT,
  type MessageContent,
} from './messageContent.ts'
import './ThroughMyEyesPage.css'

export interface ThroughMyEyesPageProps {
  readonly recipientId: RecipientId
  readonly content?: MessageContent
  readonly onNext?: () => void
}

/**
 * Message Experience presented over the continuous shooting-star sky.
 * Renders a restrained translucent panel with staged panel -> text -> NEXT entrance.
 */
export function ThroughMyEyesPage({
  recipientId,
  content = DEFAULT_MESSAGE_CONTENT,
  onNext,
}: ThroughMyEyesPageProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [recipientId])

  return (
    <section
      className="message-experience"
      data-recipient-id={recipientId}
      aria-labelledby="message-heading"
    >
      <article className="message-panel">
        <div className="message-content">
          <p className="message-eyebrow">{content.eyebrow}</p>
          <h1
            ref={headingRef}
            id="message-heading"
            className="message-heading"
            tabIndex={-1}
          >
            {content.heading}
          </h1>
          <div className="message-body">
            {content.paragraphs.map((paragraph, index) => (
              <p key={index} className="message-paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="message-actions">
          <button
            type="button"
            className="message-next-button"
            onClick={onNext}
          >
            <span>{content.nextLabel}</span>
            <span className="message-next-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </article>
    </section>
  )
}
