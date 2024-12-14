import { Checkbox } from "./checkbox";

interface SelectionCheckboxProps<T> {
  itemId: T;
  selectedItems: T[];
  onSelect: (id: T) => void;
  className?: string;
}

export function SelectionCheckbox<T>({
  itemId,
  selectedItems,
  onSelect,
  className = "absolute top-2 right-2 w-6 h-6 rounded-full active:text-primary",
}: SelectionCheckboxProps<T>) {
  return (
    <div className="p-3">
      <Checkbox
        checked={selectedItems.includes(itemId)}
        onCheckedChange={() => onSelect(itemId)}
        className={className}
      />
    </div>
  );
}
