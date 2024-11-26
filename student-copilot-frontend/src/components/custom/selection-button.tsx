import React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";

interface SelectionButtonProps {
  icon: LucideIcon | IconType;
  label: string;
  onClick: () => void;
}

const SelectionButton: React.FC<SelectionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <Button
      variant="outline"
      className="h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors"
      onClick={onClick}
    >
      <Icon className="w-8 h-8" />
      <span>{label}</span>
    </Button>
  );
};

export default SelectionButton;
