export default function Stars({ rating }) {
  const filled = Math.round(rating);

  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          className={index < filled ? "on" : ""}
          aria-hidden="true"
        >
          <path d="M10 1.8 12.4 7l5.6.5-4.3 3.6 1.3 5.4L10 13.8 5 16.5l1.3-5.4L2 7.5 7.6 7z" />
        </svg>
      ))}
    </span>
  );
}
