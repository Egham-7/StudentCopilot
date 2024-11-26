import { LucideIcon } from "lucide-react";
import SelectionButton from "./selection-button";
import { IconType } from "react-icons";

interface SelectionOption<T extends string> {
  type: T;
  icon: LucideIcon | IconType;
  label: string;
}

interface ChoiceSelectionProps<T extends string> {
  selectionOptions: SelectionOption<T>[];
  onSelect: (type: T) => void;
}

const ChoiceSelection = <T extends string>({
  selectionOptions,
  onSelect,
}: ChoiceSelectionProps<T>) => {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      {selectionOptions.map((option) => (
        <SelectionButton
          key={option.type}
          icon={option.icon}
          label={option.label}
          onClick={() => onSelect(option.type)}
        />
      ))}
    </div>
  );
};

export default ChoiceSelection;
