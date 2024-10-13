import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

// Sample tree data
const initialData: TreeNode[] = [
  {
    id: "3",
    name: "Module 1",
    children: [
      { id: "c1", name: "Lecture 1" },
      { id: "c2", name: "Lecture 2" },
      { id: "c3", name: "Lecture 3" },
    ],
  },
  {
    id: "4",
    name: "Module 2",
    children: [
      { id: "d1", name: "Lecture 1" },
      { id: "d2", name: "Lecture 2" },
      { id: "d3", name: "Lecture 3" },
    ],
  },
];

// Node rendering function with toggling and conditional rendering
function Node({
  node,
  style,
  dragHandle,
  isSidebarExpanded,
}: NodeRendererProps<TreeNode> & { isSidebarExpanded: boolean }) {
  // Automatically close the node if the sidebar is collapsed
  useEffect(() => {
    if (!isSidebarExpanded && node.isOpen) {
      node.close();
    }
  }, [isSidebarExpanded, node]);

  return (
    <div
      style={style}
      ref={node.isLeaf ? null : dragHandle} // Only parent nodes (non-leaf) are draggable
      onClick={() => node.toggle()}
    >
      {/* Use 🗂️ for module and 📖 for lecture */}
      {node.isLeaf
        ? isSidebarExpanded && "📖" // Show lecture icon only if sidebar is expanded
        : "🗂️"}{" "}
      {/* Show module icon */}
      {isSidebarExpanded && node.data.name}{" "}
      {/* Show name only if sidebar is expanded */}
    </div>
  );
}

// TreeView component
export default function TreeView() {
  const [data, setData] = useState<TreeNode[]>(initialData);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Track sidebar state

  // Helper function to find a node by its ID
  function findNodeById(data: TreeNode[], id: string): TreeNode | null {
    for (const node of data) {
      if (node.id === id) return node;
      if (node.children) {
        const childNode = findNodeById(node.children, id);
        if (childNode) return childNode;
      }
    }
    return null;
  }

  // Helper function to remove a node by its ID
  function removeNodeById(data: TreeNode[], id: string): TreeNode | null {
    for (let i = 0; i < data.length; i++) {
      const node = data[i];
      if (node.id === id) {
        data.splice(i, 1);
        return node;
      }
      if (node.children) {
        const removedNode = removeNodeById(node.children, id);
        if (removedNode) return removedNode;
      }
    }
    return null;
  }

  // Handle node movement
  const onMove = ({ dragIds, parentId, index }) => {
    const newData = [...data];

    // Remove the nodes being moved
    const nodesToMove: TreeNode[] = [];
    dragIds.forEach((id) => {
      const node = removeNodeById(newData, id);
      if (node) {
        nodesToMove.push(node);
      }
    });

    // Find the parent to move the nodes into
    const parent = findNodeById(newData, parentId);
    if (parent && parent.children) {
      parent.children.splice(index, 0, ...nodesToMove);
    } else {
      newData.splice(index, 0, ...nodesToMove); // Move to top level if no parent
    }

    setData(newData);
  };

  return (
    <div
      onMouseEnter={() => setIsSidebarExpanded(true)}
      onMouseLeave={() => setIsSidebarExpanded(false)}
      style={{
        width: isSidebarExpanded ? "300px" : "60px", // Adjust width based on sidebar state
        transition: "width 0.3s ease", // Smooth transition
        overflow: "hidden", // Prevent TreeView from expanding beyond sidebar
      }}
    >
      <Tree
        data={data}
        onMove={onMove}
        openByDefault={false}
        width={isSidebarExpanded ? 300 : 60} // Dynamic tree width
        height={1000}
        indent={24}
        rowHeight={36}
        overscanCount={1}
        paddingTop={30}
        paddingBottom={10}
        padding={25}
      >
        {(nodeProps) => (
          <Node {...nodeProps} isSidebarExpanded={isSidebarExpanded} />
        )}
      </Tree>
    </div>
  );
}
