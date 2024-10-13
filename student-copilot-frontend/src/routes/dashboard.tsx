import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";
import { Doc } from "../../convex/_generated/dataModel";
import { useUserInfo } from "@/hooks/users";
import LoadingPage from "@/components/custom/loading";
import ErrorPage from "@/components/custom/error-page";
import AddModuleCard from "@/components/custom/dashboard/add-module-card";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import ModuleCard from "@/components/custom/dashboard/module-card.js";
import { UserNotifications } from "@/components/custom/dashboard/user-notifications.js";

const filterConfig = [
  { key: "department", label: "Department" },
  { key: "credits", label: "Credits" },
  { key: "semester", label: "Semester" },
  { key: "year", label: "Year" },
];

const DashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { isLoading, error, userInfo } = useUserInfo();
  const modules = useQuery(api.modules.queryByUserId);

  const filterOptions = useMemo(() => {
    if (!modules) return {};

    return filterConfig.reduce(
      (acc, filter) => {
        acc[filter.key] = [
          "All",
          ...new Set(
            modules.map((module) =>
              String(module[filter.key as keyof Doc<"modules">])
            )
          ),
        ];
        return acc;
      },
      {} as Record<string, string[]>
    );
  }, [modules]);

  const filteredModules = useMemo(() => {
    if (!modules) return [];

    return modules.filter((module) => {
      const matchesSearch = module.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        return (
          value === "All" ||
          String(module[key as keyof Doc<"modules">]) === value
        );
      });
      return matchesSearch && matchesFilters;
    });
  }, [modules, searchTerm, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: value,
    }));
  };

  if (isLoading || modules === undefined) {
    return <LoadingPage />;
  }

  if (error || modules === null) {
    return <ErrorPage />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <header className="space-y-2 text-center sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-20">
            Welcome {userInfo?.name}
          </h1>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Student Dashboard
          </h2>
          <p className="text-lg text-muted-foreground">
            Track your modules and academic progress
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="h-96 overflow-scroll md:h-full">
            <UserNotifications />
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-card text-card-foreground">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search modules..."
                  className="pl-10 bg-background text-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-5 w-5" />
                <span className="font-semibold">Filters:</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {filterConfig.map((filter) => (
                  <div key={filter.key} className="flex flex-col gap-1">
                    <label
                      htmlFor={filter.key}
                      className="text-sm font-medium text-foreground"
                    >
                      {filter.label}
                    </label>
                    <Select
                      value={filters[filter.key] || "All"}
                      onValueChange={(value) =>
                        handleFilterChange(filter.key, value)
                      }
                    >
                      <SelectTrigger
                        id={filter.key}
                        className="bg-background text-foreground"
                      >
                        <SelectValue placeholder={`Select ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOptions[filter.key].map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((module) => (
            <ModuleCard key={module._id} module={module} />
          ))}

          <AddModuleCard />
        </div>
        {filteredModules.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No modules found. Try adjusting your search or filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
