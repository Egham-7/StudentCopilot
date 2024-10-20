type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
}

const Logo: React.FC<LogoProps> = ({ size = "lg" }) => {
  const sizeClasses: Record<LogoSize, string> = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-64 w-64",
  };

  return (
    <div className="flex items-center justify-center">
      <img
        src="/logo.png"
        alt="Company Logo"
        className={`object-contain mix-blend-multiply ${sizeClasses[size]} transition-transform duration-300 ease-in-out hover:scale-110`}
      />
    </div>
  );
};

export default Logo;
