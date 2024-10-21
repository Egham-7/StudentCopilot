import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { PiStackFill, PiBookOpenTextFill } from "react-icons/pi";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
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
        children: isSidebarOpen
          ? [
              {
                id: `${module._id}-lectures`,
                name: "Lectures",
              },
            ]
          : [],
      }));
      setTreeData(formattedData);
    }
  }, [modules, isSidebarOpen]);

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
  const icon = isLecture ? <PiBookOpenTextFill /> : <PiStackFill />;
  const linkTo = isLecture
    ? `/dashboard/lectures/${node.parent?.id}`
    : `/dashboard/module/${node.id}`;

  return (
    <div
      className={cn(
        "flex items-center p-2 rounded-md transition-colors duration-200",
        {
          "hover:bg-gray-100": isSidebarOpen,
          "pl-8": isLecture,
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
