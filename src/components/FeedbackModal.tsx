/**
 * Review Gating — Robin des Airs
 * Composant React de référence. Version utilisée en production : assets/feedback-modal.js (vanilla).
 *
 * Affiche après la soumission du dossier :
 * - Question + 5 étoiles cliquables
 * - 1–3 étoiles : champ "Comment nous améliorer ?" + envoi → "Merci pour votre retour précieux."
 * - 4–5 étoiles : message enthousiaste + bouton "Laisser un avis sur Google"
 * Mobile-first.
 */

import React, { useState, useCallback } from 'react';

const STORAGE_KEY = 'robin_feedback_sent';

export interface FeedbackModalConfig {
  webhookUrl?: string;
  googleReviewUrl?: string;
  source?: string;
}

const defaultGoogleUrl = 'https://search.google.com/local/writereview?placeid=TON_LIEN_GOOGLE_BUSINESS';

export function FeedbackModal({
  isOpen,
  onClose,
  config = {},
}: {
  isOpen: boolean;
  onClose: () => void;
  config?: FeedbackModalConfig;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<'stars' | 'low' | 'thanks' | 'high'>('stars');
  const { webhookUrl = '', googleReviewUrl = defaultGoogleUrl, source = 'depot' } = config;

  const sendFeedback = useCallback(
    (r: number, c: string | null) => {
      const payload = {
        type: 'feedback',
        rating: r,
        comment: c,
        source,
        timestamp: new Date().toISOString(),
      };
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => console.log('Feedback (log):', payload));
      } else {
        console.log('Feedback (log):', payload);
      }
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {}
    },
    [webhookUrl, source]
  );

  const handleStarClick = useCallback(
    (value: number) => {
      setRating(value);
      if (value <= 3) {
        setStep('low');
      } else {
        sendFeedback(value, null);
        setStep('high');
      }
    },
    [sendFeedback]
  );

  const handleSendFeedback = useCallback(() => {
    if (rating == null) return;
    sendFeedback(rating, comment.trim() || null);
    setStep('thanks');
    setTimeout(onClose, 2200);
  }, [rating, comment, sendFeedback, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="feedback-overlay"
      role="dialog"
      aria-label="Avis sur votre expérience"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,31,58,.92)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        overflowY: 'auto',
      }}
    >
      <div
        className="feedback-modal"
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 400,
          width: '100%',
          padding: '28px 22px',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            border: 'none',
            background: 'rgba(255,255,255,.15)',
            color: '#fff',
            borderRadius: '50%',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        {step === 'stars' && (
          <>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#0B1F3A',
                textAlign: 'center',
                margin: '0 0 20px',
                lineHeight: 1.35,
              }}
            >
              Comment s'est passée votre expérience avec Robin des Airs ?
            </h3>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 24,
              }}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} sur 5`}
                  onClick={() => handleStarClick(value)}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.textContent = '★';
                    el.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.textContent = rating != null && value <= rating ? '★' : '☆';
                    if (rating == null) el.style.transform = 'scale(1)';
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 28,
                    lineHeight: 1,
                    color: rating != null && value <= rating ? '#00C87A' : '#ccc',
                  }}
                >
                  {rating != null && value <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'low' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6B7A90', margin: '0 0 14px', lineHeight: 1.5 }}>
              Nous sommes désolés. Comment pouvons-nous nous améliorer ?
            </p>
            <textarea
              placeholder="Votre message (optionnel)"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%',
                minHeight: 90,
                padding: '12px 14px',
                border: '1.5px solid #E2E6EE',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 12,
                fontFamily: 'inherit',
              }}
            />
            <button
              type="button"
              onClick={handleSendFeedback}
              style={{
                width: '100%',
                padding: 14,
                background: '#0B1F3A',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Envoyer mon retour
            </button>
          </div>
        )}

        {step === 'thanks' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0B1F3A', margin: 0 }}>
              Merci pour votre retour précieux.
            </p>
          </div>
        )}

        {step === 'high' && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 42, display: 'block', marginBottom: 10 }}>🏹</span>
            <p
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#0B1F3A',
                margin: '0 0 8px',
                lineHeight: 1.35,
              }}
            >
              Génial ! Aidez la communauté en 30 secondes.
            </p>
            <p style={{ fontSize: 13, color: '#6B7A90', margin: '0 0 20px', lineHeight: 1.5 }}>
              Votre avis aide d'autres voyageurs à récupérer leurs 600€.
            </p>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                maxWidth: 320,
                padding: '16px 24px',
                background: 'linear-gradient(135deg,#4285F4,#34A853)',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(66,133,244,.4)',
              }}
            >
              Laisser un avis sur Google
            </a>
            <p style={{ fontSize: 12, color: '#6B7A90', marginTop: 16, lineHeight: 1.5 }}>
              Votre avis aide d'autres voyageurs à récupérer leurs 600€.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackModal;
