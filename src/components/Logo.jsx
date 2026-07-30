import {
  logoHorizontalDark,
  logoHorizontalLight,
  logoIconDark,
  logoIconLight,
  logoStackedDark,
  logoStackedLight,
} from "../assets/branding";

const logoMap = {
  horizontal: { light: logoHorizontalLight, dark: logoHorizontalDark },
  stacked: { light: logoStackedLight, dark: logoStackedDark },
  icon: { light: logoIconLight, dark: logoIconDark },
};

export function Logo({ variant = "horizontal", theme = "dark", className = "" }) {
  const src = logoMap[variant]?.[theme] || logoHorizontalDark;

  if (variant === "icon") {
    return <img src={src} alt="LockOn" className={`w-10 h-10 object-contain ${className}`} />;
  }

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <img src={src} alt="LockOn" className="w-16 h-16 object-contain" />
      </div>
    );
  }

  return (
    <img src={src} alt="LockOnRevision" className={`h-10 w-auto object-contain ${className}`} />
  );
}
