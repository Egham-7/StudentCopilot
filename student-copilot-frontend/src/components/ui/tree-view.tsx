import { useState, useEffect } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { PiStackFill, PiBookOpenTextFill } from "react-icons/pi"; // Icons for module and lecture
import { Link } from "react-router-dom";
import { useQuery } from "convex/react"; // Querying from Convex
import { api } from "../../../convex/_generated/api"; // Import API methods from Convex

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

// Helper function to find and remove a node by ID
function removeNodeById(data: TreeNode[], id: string): TreeNode | null {
  for (let i = 0; i < data.length; i++) {
    const node = data[i];
    if (node.id === id) {
      data.splice(i, 1);
      return node;
    }
    if (node.children) {
      const removedNode = removeNodeById(node.children, id);
      if (removedNode) {
        return removedNode;
      }
    }
  }
  return null;
}

// TreeView component
export default function TreeView({
  isSidebarOpen,
}: {
  isSidebarOpen: boolean;
}) {
  const modules = useQuery(api.modules.queryByUserId); // Querying Convex for user modules
  const [treeData, setTreeData] = useState<TreeNode[]>([]);

  // Format the data received from Convex to match the TreeNode structure
  useEffect(() => {
    if (modules) {
      // Each module is a parent node, with lectures as children
      const formattedData: TreeNode[] = modules.map((module) => ({
        id: module._id,
        name: module.name, // Module name
        children:
          module.lectures?.map((lecture) => ({
            id: lecture._id,
            name: lecture.title, // Lecture title
          })) || [], // Ensure we have an empty array if there are no lectures
      }));
      setTreeData(formattedData);
    }
  }, [modules]);

  // Handle node movement
  const onMove = ({ dragIds, parentId, index }) => {
    const newData = [...treeData];

    // Remove the node(s) being dragged
    const nodesToMove: TreeNode[] = [];
    dragIds.forEach((id) => {
      const node = removeNodeById(newData, id);
      if (node) {
        nodesToMove.push(node);
      }
    });

    // Find the parent node to insert the dragged node(s)
    if (parentId) {
      const parentNode = newData.find((node) => node.id === parentId);
      if (parentNode && parentNode.children) {
        parentNode.children.splice(index, 0, ...nodesToMove); // Insert node at the new index under the parent
      }
    } else {
      newData.splice(index, 0, ...nodesToMove); // If no parent, insert at the top level
    }

    setTreeData(newData); // Update the tree data
  };

  return (
    <div className="flex-grow overflow-hidden">
      <Tree
        data={treeData} // Data contains modules (parents) and lectures (children)
        onMove={onMove} // Handle node movement
        openByDefault={false} // Tree starts closed by default
        width={isSidebarOpen ? 300 : 60} // Adjusts based on sidebar state
        height={400} // Adjust height according to your layout
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

// Node rendering function with linking and conditional rendering
function Node({
  node,
  style,
  dragHandle,
  isSidebarOpen,
}: NodeRendererProps<TreeNode> & { isSidebarOpen: boolean }) {
  useEffect(() => {
    if (!isSidebarOpen && node.isOpen) {
      node.close();
    }
  }, [isSidebarOpen, node]);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        paddingLeft: "8px",
      }}
      ref={node.isLeaf ? null : dragHandle} // Only draggable if it's not a leaf node
      onClick={() => node.toggle()} // Toggle node (open/close) on click
    >
      {/* Show correct icon depending on whether it's a module or a lecture */}
      {node.children ? <PiStackFill /> : <PiBookOpenTextFill />}{" "}
      {/* If there are children, it's a module (parent); otherwise, it's a lecture (leaf) */}
      {isSidebarOpen && (
        <Link
          to={`/dashboard/module/${node.id}`} // Links to the specific module page
          style={{
            marginLeft: "8px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          {node.data.name} {/* Show the name of the module or lecture */}
        </Link>
      )}
    </div>
  );
}
