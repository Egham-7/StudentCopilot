import { useState, useCallback, useMemo, useEffect, forwardRef } from "react";
import { MessageCircleIcon, PlusCircleIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LecturesData } from "@/lib/ui_utils";
import { Popover } from "@/components/ui/popover";
import { PopoverContent, PopoverTrigger } from "@radix-ui/react-popover";
import { Doc, Id } from "convex/_generated/dataModel";
import { v4 as uuidv4 } from "uuid";
import ChatDialog from "./chat-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";


const TriggerButton = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>((props, ref) => (
  <Button
    ref={ref}
    className="
      rounded-full
      fixed
      bottom-2
      right-6
      shadow-lg
      bg-primary
      text-primary-foreground
      hover:bg-primary/90
    "
    {...props}
  >
    <span className="hidden md:inline">Module Assistant</span>
    <MessageCircleIcon className="h-6 w-6 ml-2" />
  </Button>
));

TriggerButton.displayName = 'TriggerButton';

interface SessionsListProps {
  sessions: Session[];
  onSessionClick: (id: string) => void;
  onNewSession: () => void;
  onSessionsClear: () => void;
}

const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  onSessionClick,
  onNewSession,
  onSessionsClear,
}) => {
  return (
    <div className="p-4">
      <div className="flex  justify-between items-center w-full mb-4">
        <h3 className="text-lg font-semibold">Chat Sessions</h3>

        <Button
          variant={"ghost"}
          onClick={onSessionsClear}
          className="text-red-500"
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Clear All
        </Button>
      </div>
      <ul className="space-y-2 mb-4">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="p-2 bg-muted rounded-md hover:bg-accent cursor-pointer transition-colors truncate"
            onClick={() => onSessionClick(session.id)}
          >
            {session.name}
          </li>
        ))}
      </ul>
      <Button onClick={onNewSession} className="w-full">
        <PlusCircleIcon className="mr-2 h-4 w-4" />
        New Chat
      </Button>
    </div>
  );
};

interface ModuleChatProps {
  lectures: LecturesData[] | undefined | null;
  module: Doc<"modules">;
}

type Session = {
  id: string;
  name: string;
};

export default function ModuleChat({ lectures, module }: ModuleChatProps) {
  // Query only the last message of each session
  const sessionMessages = useQuery(
    api.aiChats.listLastMessagesPerSession,
    module?._id ? { moduleId: module._id as Id<"modules"> } : "skip",
  );

  const deleteChats = useMutation(api.aiChats.clearAllChats);

  const [activeTab, setActiveTab] = useState("chat");

  const sessions: Session[] = useMemo(() => {
    if (!sessionMessages) return [];
    return sessionMessages.map((message) => ({
      id: message.sessionId,
      name: message.body,
    }));
  }, [sessionMessages]);

  const [sessionId, setSessionId] = useState<string>(sessions[0]?.id);

  const createNewSession = useCallback(() => {
    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setActiveTab("chat");
  }, []);

  useEffect(() => {
    if (sessions.length === 0 && !sessionId) {
      createNewSession();
    } else if (sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId, createNewSession]);

  const handleSessionClick = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  const handleSessionsClear = useCallback(() => {
    deleteChats({ moduleId: module?._id });
  }, [module?._id, deleteChats]);

  const isDesktop = useMediaQuery("(min-width: 768px)");


  const tabs = useMemo(
    () => [
      {
        value: "chat",
        label: "Chat",
        content: (
          <ChatDialog
            lectures={lectures}
            moduleId={module?._id}
            sessionId={sessionId}
          />
        ),
      },
      {
        value: "sessions",
        label: "Sessions",
        content: (
          <SessionsList
            sessions={sessions}
            onSessionClick={handleSessionClick}
            onNewSession={createNewSession}
            onSessionsClear={handleSessionsClear}
          />
        ),
      },
    ],
    [
      lectures,
      module?._id,
      sessionId,
      sessions,
      createNewSession,
      handleSessionClick,
      handleSessionsClear,
    ],
  );


  const ChatContent = () => (
    <Tabs
      defaultValue={activeTab}
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full"
    >
      <TabsList className="w-full bg-muted h-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-1 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );

  if (isDesktop) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <TriggerButton />
        </PopoverTrigger>
        <PopoverContent className="w-[600px] max-h-full mr-5 mb-5 bg-background border border-border rounded-md shadow-lg">
          <ChatContent />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <TriggerButton />
      </DrawerTrigger>
      <DrawerContent className="p-4">
        <ChatContent />
      </DrawerContent>
    </Drawer>
  );;

}
