import { memo, useCallback } from 'react';

function StarRating({ rating = 0, onChange, readonly = false }) {
  const handleKey = useCallback(
    (event, star) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChange?.(rating === star ? 0 : star);
      }
    },
    [onChange, rating],
  );

  return (
    <div
      className="nf-star-rating"
      role={readonly ? 'img' : 'group'}
      aria-label={`Rating: ${rating} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`nf-star ${star <= rating ? 'nf-star--filled' : ''} ${readonly ? '' : 'nf-star--interactive'}`}
          role={readonly ? undefined : 'button'}
          tabIndex={readonly ? undefined : 0}
          aria-label={readonly ? undefined : `${star} star${star > 1 ? 's' : ''}`}
          onClick={readonly ? undefined : () => onChange?.(rating === star ? 0 : star)}
          onKeyDown={readonly ? undefined : (event) => handleKey(event, star)}
          aria-pressed={readonly ? undefined : star <= rating}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default memo(StarRating);
