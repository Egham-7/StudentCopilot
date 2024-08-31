import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export interface UserInfo {
  _id: string;
  _creationTime: number;
  clerkId: string;
  name: string;
  noteTakingStyle: string;
  learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical";
  course: string;
  levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD";
}

export function useUserInfo() {
  const userInfo = useQuery(api.users.getUserInfo);

  return {
    userInfo: userInfo as UserInfo | undefined,
    isLoading: userInfo === undefined,
    error: userInfo instanceof Error ? userInfo : null,
  };
}

