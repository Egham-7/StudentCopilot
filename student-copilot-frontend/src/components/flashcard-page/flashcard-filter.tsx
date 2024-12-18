import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "new" | "learning" | "review" | "mastered";

interface FlashcardFilterProps {
  filter: FilterType;
  onFilterChange: (value: FilterType) => void;
}

export function FlashcardFilter({
  filter,
  onFilterChange,
}: FlashcardFilterProps) {
  return (
    <Select value={filter} onValueChange={onFilterChange}>
      <SelectTrigger className="w-[180px] bg-card text-card-foreground">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Cards</SelectItem>
        <SelectItem value="new">New Cards</SelectItem>
        <SelectItem value="learning">Learning</SelectItem>
        <SelectItem value="review">Review</SelectItem>
        <SelectItem value="mastered">Mastered</SelectItem>
      </SelectContent>
    </Select>
  );
}
