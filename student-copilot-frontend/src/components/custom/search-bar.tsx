import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search } from "lucide-react";

export interface SearchOption {
  value: string;
  label: string;
}

interface BaseSearchBarProps {
  placeholder: string;
  searchOptions: SearchOption[];
  onSearch: (searchTerm: string, searchBy: string) => Promise<void>;
}

export function BaseSearchBar({ placeholder, searchOptions, onSearch }: BaseSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<string>(searchOptions[0].value);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      await onSearch(searchTerm, searchBy);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center space-x-4 mb-4">
      <div className="flex-grow">
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyPress}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Search by {searchOptions.find(opt => opt.value === searchBy)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {searchOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setSearchBy(option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? "Searching..." : "Search"}
      </Button>
    </div>
  );
}

