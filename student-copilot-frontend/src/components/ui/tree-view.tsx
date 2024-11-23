import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { PiStackFill, PiBookOpenTextFill, PiNoteFill } from "react-icons/pi";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { TbCards } from "react-icons/tb"


interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isModule?: boolean;
  isOpen?: boolean;
}

interface NodeProps extends NodeRendererProps<TreeNode> {
  isSidebarOpen: boolean;
  onToggle: (nodeId: string) => void;
}

export default function TreeView({
  isSidebarOpen,
}: {
  isSidebarOpen: boolean;
}) {
  const modules = useQuery(api.modules.queryByUserId);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (modules) {
      const formattedData: TreeNode[] = modules.map((module) => ({
        id: module._id,
        name: module.name,
        isModule: true,
        isOpen: true,
        children: isSidebarOpen
          ? [
            {
              id: `${module._id}-lectures`,
              name: "Lectures",
            },
            {
              id: `${module._id}-notes`,
              name: "Notes",
            },

            {
              id: `${module._id}-flashcards`,
              name: "Flashcard Sets"
            }
          ]
          : [],
      }));
      setTreeData(formattedData);
    }
  }, [modules]);

  const isModuleNode = (nodes: TreeNode[], id: string): boolean => {
    const node = findNode(nodes, id);
    return node?.isModule ?? false;
  };

  const onMove = ({
    dragIds,
    parentId,
    index,
  }: {
    dragIds: string[];
    parentId: string | null;
    index: number;
  }) => {
    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const nodesToMove = dragIds
        .map((id) => findNode(newData, id))
        .filter(Boolean) as TreeNode[];

      // Check if any of the nodes to move are "Lectures" or "Notes"
      const hasLecturesOrNotes = nodesToMove.some(
        (node) => node.name === "Lectures" || node.name === "Notes",
      );

      // If moving "Lectures" or "Notes", ensure they stay within their parent module
      if (hasLecturesOrNotes) {
        const originalParentId = nodesToMove[0].id.split("-")[0];
        if (parentId !== originalParentId) {
          return prevData; // Cancel the move if trying to move outside the parent module
        }
      }

      // If moving to a non-module parent (except for Lectures/Notes within their module), cancel the move
      if (parentId && !isModuleNode(newData, parentId) && !hasLecturesOrNotes) {
        return prevData;
      }

      // Remove nodes from their original positions
      dragIds.forEach((id) => removeNode(newData, id));

      // Insert nodes at the new position
      if (parentId) {
        const parent = findNode(newData, parentId);
        if (parent && parent.children) {
          parent.children.splice(index, 0, ...nodesToMove);
        }
      } else {
        newData.splice(index, 0, ...nodesToMove);
      }

      return newData;
    });
  };

  const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const removeNode = (nodes: TreeNode[], id: string) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].children && removeNode(nodes[i].children ?? [], id)) {
        return true;
      }
    }
    return false;
  };



  const toggleNode = (nodeId: string) => {
    setTreeData((prevData) => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const node = findNode(newData, nodeId);

      if (node && node.isModule) {
        // Toggle the open state
        node.isOpen = !node.isOpen;

        // If node has no children and we're opening it, add children
        if (node.isOpen && (!node.children || node.children.length === 0)) {
          node.children = [
            {
              id: `${node.id}-lectures`,
              name: "Lectures",
            },
            {
              id: `${node.id}-notes`,
              name: "Notes",
            },
            {
              id: `${node.id}-flashcards`,
              name: "Flashcard Sets"
            }
          ];
        }
        // If node is being closed, clear children
        else if (!node.isOpen) {
          node.children = [];
        }
      }

      return newData;
    });
  };

  return (
    <div className="flex-grow overflow-hidden">
      <Tree
        data={treeData}
        onMove={onMove}
        width={isSidebarOpen ? 300 : 60}
        height={window.innerHeight - 64}
        indent={24}
        rowHeight={36}
        overscanCount={5}
        paddingTop={10}
        paddingBottom={10}
        padding={25}

      >
        {(props) => (
          <Node {...props} isSidebarOpen={isSidebarOpen} onToggle={toggleNode} />
        )}
      </Tree>
    </div>
  );
}

function Node({ node, dragHandle, isSidebarOpen, onToggle }: NodeProps) {
  const nodeType = node.data.name;
  const isModule = node.data.isModule;
  const isOpen = node.data.isOpen;

  const iconMap = {
    'Lectures': <PiBookOpenTextFill className="text-primary" />,
    'Notes': <PiNoteFill className="text-primary" />,
    'Flashcard Sets': <TbCards className="text-primary" />,
    'default': <PiStackFill className="text-primary" />
  };

  const routeMap = {
    'Lectures': `/dashboard/lectures/${node.parent?.id}`,
    'Notes': `/dashboard/notes/${node.parent?.id}`,
    'Flashcard Sets': `/dashboard/flashcards/${node.parent?.id}`,
    'default': `/dashboard/module/${node.id}`
  };

  const icon = iconMap[nodeType as keyof typeof iconMap] || iconMap.default;
  const linkTo = routeMap[nodeType as keyof typeof routeMap] || routeMap.default;

  return (
    <div
      className={cn(
        "flex items-center p-2 rounded-md transition-all duration-300 ease-in-out",
        {
          "hover:bg-accent": isSidebarOpen,
          "pl-8": nodeType === "Lectures" || nodeType === "Notes" || nodeType === "Flashcard Sets",
          "opacity-100": true,
        }
      )}
      ref={dragHandle}
    >
      {isModule && isSidebarOpen && (
        <button
          onClick={() => onToggle(node.id)}
          className="mr-1 w-4 h-4 flex items-center justify-center hover:bg-accent rounded-sm transition-colors duration-200"
        >
          <svg
            className={cn(
              "w-3 h-3 transform transition-transform duration-300 ease-in-out",
              isOpen ? "rotate-90" : "rotate-0"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
      <div className="transition-transform duration-300 ease-in-out">
        {icon}
      </div>
      {isSidebarOpen && (
        <Link
          to={linkTo}
          className="ml-3 truncate whitespace-nowrap overflow-hidden max-w-[200px] inline-block text-sm text-foreground hover:text-primary transition-colors duration-200"
        >
          {node.data.name}
        </Link>
      )}
    </div>
  );
}

