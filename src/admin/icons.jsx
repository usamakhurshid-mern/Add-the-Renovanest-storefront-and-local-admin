export default function Icon({ name }) {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const paths = {
  tag: (
    <>
      <path d="M20 13l-7 7-9-9V4h7l9 9z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  swatch: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  megaphone: <path d="M4 10v4h3l5 3V7L7 10H4zM16 9.5a3.5 3.5 0 0 1 0 5" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  footer: <path d="M4 5h16v14H4zM4 15h16" />,
  home: <path d="M4 11.5 12 4l8 7.5V20H4z" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  box: <path d="M12 3 20 7.5 12 12 4 7.5 12 3zM4 7.5V16.5L12 21l8-4.5V7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  file: <path d="M7 3h7l5 5v13H7zM14 3v5h5" />,
  folder: <path d="M3 7h6l2 2h10v9H3z" />,
  bag: <path d="M6 8h12l-1 12H7L6 8zM9 8V7a3 3 0 0 1 6 0v1" />,
  plus: <path d="M12 5v14M5 12h14" />,
  external: <path d="M14 5h5v5M19 5l-9 9M10 5H5v14h14v-5" />,
  logout: <path d="M10 7V5H5v14h5v-2M10 12h9M16 9l3 3-3 3" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  layout: <path d="M4 5h16v14H4zM4 10h16M10 10v9" />,
};
