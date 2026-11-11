import SmartLink from "./SmartLink";

export default function LogoMark({ brand, className = "logo" }) {
  const showName = !brand.logo || brand.showName !== false;
  return (
    <SmartLink to="/" className={className} aria-label={`${brand.name} home`}>
      {brand.logo ? <img className="logo-image" src={brand.logo} alt="" /> : <span className="logo-orb" aria-hidden="true" />}
      {showName && <span className="logo-name">{brand.name}</span>}
    </SmartLink>
  );
}
