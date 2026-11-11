import { Link } from "react-router-dom";

export default function SmartLink({ to, children, className, ...rest }) {
  if (!to) return <span className={className}>{children}</span>;
  if (/^https?:/i.test(to)) {
    return (
      <a href={to} className={className} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className} {...rest}>
      {children}
    </Link>
  );
}
