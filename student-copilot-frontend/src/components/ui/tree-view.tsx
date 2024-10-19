import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { PiStackFill } from "react-icons/pi";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface TreeNode {
  id: string;
  name: string;
}

// TreeView component
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
      }));
      setTreeData(formattedData);
    }
  }, [modules]);

  const onMove = ({ dragIds, index }: { dragIds: string[]; index: number }) => {
    const newData = [...treeData];
    const nodesToMove = dragIds
      .map((id) => newData.find((node) => node.id === id))
      .filter(Boolean) as TreeNode[];
    dragIds.forEach((id) => {
      const index = newData.findIndex((node) => node.id === id);
      if (index !== -1) newData.splice(index, 1);
    });
    newData.splice(index, 0, ...nodesToMove);
    setTreeData(newData);
  };

  return (
    <div className="flex-grow overflow-hidden">
      <Tree
        data={treeData}
        onMove={onMove}
        width={isSidebarOpen ? 300 : 60}
        height={400}
        indent={24}
        rowHeight={36}
        overscanCount={1}
        paddingTop={10}
        paddingBottom={0}
        padding={25}
      >
        {(nodeProps) => <Node {...nodeProps} isSidebarOpen={isSidebarOpen} />}
      </Tree>
    </div>
  );
}

function Node({
  node,
  style,
  dragHandle,
  isSidebarOpen,
}: NodeRendererProps<TreeNode> & { isSidebarOpen: boolean }) {
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        paddingLeft: "8px",
      }}
      ref={dragHandle}
    >
      <PiStackFill />
      {isSidebarOpen && (
        <Link
          to={`/dashboard/module/${node.id}`}
          style={{
            marginLeft: "8px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {node.data.name}
        </Link>
      )}
    </div>
  );
}
