import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { PiStackFill, PiBookOpenTextFill, PiNoteFill } from "react-icons/pi";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  isModule?: boolean;
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
            ]
          : [],
      }));
      setTreeData(formattedData);
    }
  }, [modules, isSidebarOpen]);

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

  return (
    <div className="flex-grow overflow-auto">
      <Tree
        data={treeData}
        onMove={onMove}
        width={isSidebarOpen ? 300 : 60}
        height={window.innerHeight - 64} // Subtract header height
        indent={24}
        rowHeight={36}
        overscanCount={5}
        paddingTop={10}
        paddingBottom={10}
        padding={25}
      >
        {(nodeProps) => <Node {...nodeProps} isSidebarOpen={isSidebarOpen} />}
      </Tree>
    </div>
  );
}

function Node({
  node,
  dragHandle,
  isSidebarOpen,
}: NodeRendererProps<TreeNode> & { isSidebarOpen: boolean }) {
  const isLecture = node.data.name === "Lectures";
  const isNotes = node.data.name === "Notes";

  let icon;
  if (isLecture) {
    icon = <PiBookOpenTextFill />;
  } else if (isNotes) {
    icon = <PiNoteFill />;
  } else {
    icon = <PiStackFill />;
  }

  let linkTo;
  if (isLecture) {
    linkTo = `/dashboard/lectures/${node.parent?.id}`;
  } else if (isNotes) {
    linkTo = `/dashboard/notes/${node.parent?.id}`;
  } else {
    linkTo = `/dashboard/module/${node.id}`;
  }

  return (
    <div
      className={cn(
        "flex items-center p-2 rounded-md transition-colors duration-200",
        {
          "hover:bg-gray-100": isSidebarOpen,
          "pl-8": isLecture || isNotes,
        },
      )}
      ref={dragHandle}
    >
      {icon}
      {isSidebarOpen && (
        <Link
          to={linkTo}
          className="ml-3 truncate whitespace-nowrap overflow-hidden max-w-[200px] inline-block text-sm"
        >
          {node.data.name}
        </Link>
      )}
    </div>
  );
}
