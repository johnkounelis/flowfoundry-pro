"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { Button, Badge } from "@flowfoundry/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { MessageBanner } from "@/components/MessageBanner";

interface Node {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: any;
}

interface Edge {
  id: string;
  source: string;
  target: string;
}

function FlowBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flowId");
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [connectingPosition, setConnectingPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [flowName, setFlowName] = useState("Untitled Flow");
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: existingFlow } = trpc.flows.getById.useQuery(
    { id: flowId! },
    { enabled: !!flowId }
  );

  const createFlow = trpc.flows.create.useMutation();
  const saveVersion = trpc.flows.saveVersion.useMutation();
  const triggerFlow = trpc.flows.trigger.useMutation();

  // Load existing flow
  useEffect(() => {
    if (existingFlow && existingFlow.definition) {
      const def = existingFlow.definition as any;
      if (def.nodes) setNodes(def.nodes);
      if (def.edges) setEdges(def.edges);
      if (existingFlow.name) setFlowName(existingFlow.name);
    } else if (!flowId && nodes.length === 0) {
      // Initialize with default trigger node if no flowId and no nodes
      setNodes([
        {
          id: "trigger-1",
          type: "TRIGGER",
          name: "Webhook Trigger",
          position: { x: 100, y: 100 },
          data: { url: "https://api.flowfoundry.com/webhook/abc123" }
        }
      ]);
    }
  }, [existingFlow, flowId]);

  const nodeTypes = [
    { type: "TRIGGER", name: "Trigger", icon: "⚡", color: "bg-green-100 text-green-800" },
    { type: "AI_STEP", name: "AI Step", icon: "🤖", color: "bg-purple-100 text-purple-800" },
    { type: "SLACK", name: "Slack", icon: "💬", color: "bg-blue-100 text-blue-800" },
    { type: "GMAIL", name: "Gmail", icon: "📧", color: "bg-red-100 text-red-800" },
    { type: "HTTP", name: "HTTP", icon: "🌐", color: "bg-gray-100 text-gray-800" },
    { type: "WEBHOOK", name: "Webhook", icon: "🔗", color: "bg-orange-100 text-orange-800" },
  ];

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      name: nodeTypes.find(nt => nt.type === type)?.name || type,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 },
      data: {}
    };
    setNodes([...nodes, newNode]);
  };

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    // Don't select if clicking on connection handle
    if ((e.target as HTMLElement).closest('.connection-handle')) {
      return;
    }
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    // Don't drag if clicking on connection handle
    if ((e.target as HTMLElement).closest('.connection-handle')) {
      return;
    }
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDragOffset({
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      });
    }
  };

  const handleNodeDrag = (e: MouseEvent) => {
    if (!isDragging || !draggedNodeId) return;
    
    setNodes(nodes.map(node => 
      node.id === draggedNodeId 
        ? { ...node, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
        : node
    ));
  };

  const handleNodeDragEnd = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  const handleConnectionStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectingSource(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnectingPosition({
        x: node.position.x + 140 + rect.left,
        y: node.position.y + 50 + rect.top
      });
    }
  };

  const handleConnectionEnd = (targetNodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (connectingSource && connectingSource !== targetNodeId) {
      // Check if connection already exists
      const connectionExists = edges.some(
        edge => edge.source === connectingSource && edge.target === targetNodeId
      );
      
      if (!connectionExists) {
        const newEdge: Edge = {
          id: `edge-${connectingSource}-${targetNodeId}-${Date.now()}`,
          source: connectingSource,
          target: targetNodeId
        };
        setEdges([...edges, newEdge]);
      }
    }
    
    setConnectingSource(null);
    setConnectingPosition(null);
    setHoveredTarget(null);
  };

  const handleConnectionCancel = () => {
    setConnectingSource(null);
    setConnectingPosition(null);
    setHoveredTarget(null);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(edges.filter(e => e.id !== edgeId));
  };

  // Global mouse handlers for dragging and connecting
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && draggedNodeId) {
        handleNodeDrag(e);
      } else if (connectingSource && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setConnectingPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleNodeDragEnd();
      } else if (connectingSource) {
        handleConnectionCancel();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, draggedNodeId, connectingSource, dragOffset, nodes]);

  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const saveFlow = async () => {
    if (nodes.length === 0) {
      setMessage({ type: "error", text: "Please add at least one node to save the flow." });
      return;
    }

    if (!flowName.trim()) {
      setMessage({ type: "error", text: "Please enter a flow name." });
      return;
    }

    try {
      const definition = { nodes, edges };

      if (flowId) {
        // Save new version
        await saveVersion.mutateAsync({ flowId, definition });
        setMessage({ type: "success", text: "Flow saved successfully!" });
      } else {
        // Create new flow
        const result = await createFlow.mutateAsync({
          name: flowName,
          definition
        });
        setMessage({ type: "success", text: "Flow created successfully!" });
        // Redirect to the new flow
        setTimeout(() => {
          router.push(`/flows/${result.id}`);
        }, 1000);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to save flow. Please try again." });
    }
  };

  const testFlow = async () => {
    if (!flowId) {
      setMessage({ type: "error", text: "Please save the flow first before testing." });
      return;
    }

    if (nodes.length === 0) {
      setMessage({ type: "error", text: "Please add at least one node to test the flow." });
      return;
    }

    try {
      await triggerFlow.mutateAsync({ flowId, payload: {} });
      setMessage({ type: "success", text: "Test run started! Check the runs page for results." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to start test run. Please try again." });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="secondary" onClick={() => router.back()}>
              ← Back
            </Button>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2"
              placeholder="Flow Name"
            />
            <Badge color="blue">Draft</Badge>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="secondary" 
              onClick={testFlow}
              disabled={triggerFlow.isPending || !flowId}
            >
              {triggerFlow.isPending ? "Testing..." : "Test Flow"}
            </Button>
            <Button 
              onClick={saveFlow}
              disabled={createFlow.isPending || saveVersion.isPending}
            >
              {createFlow.isPending || saveVersion.isPending ? "Saving..." : "Save Flow"}
            </Button>
          </div>
        </div>
        {message && (
          <MessageBanner
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
          />
        )}
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">Add Nodes</h3>
          <div className="space-y-2">
            {nodeTypes.map((nodeType) => (
              <button
                key={nodeType.type}
                onClick={() => addNode(nodeType.type)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all hover:shadow-sm active:scale-95"
              >
                <div className="flex items-center">
                  <span className="text-xl mr-3">{nodeType.icon}</span>
                  <span className="font-medium text-sm">{nodeType.name}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">Flow Info</h3>
            <div className="text-sm text-gray-600 space-y-3">
              <div className="flex justify-between items-center">
                <span>Nodes:</span>
                <Badge color="blue">{nodes.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Connections:</span>
                <Badge color="green">{edges.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <Badge color="gray">Draft</Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700">Tip:</strong> Drag from the right handle of a node to the left handle of another node to create connections.
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          >
            {/* SVG for all connections */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 5, 0 10"
                    fill="#6b7280"
                  />
                </marker>
                <marker
                  id="arrowhead-connecting"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 5, 0 10"
                    fill="#3b82f6"
                  />
                </marker>
                <marker
                  id="arrowhead-valid"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 5, 0 10"
                    fill="#10b981"
                  />
                </marker>
              </defs>
              
              {/* Existing connections */}
              {edges.map((edge) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;

                const startX = sourceNode.position.x + 140; // Right edge
                const startY = sourceNode.position.y + 50; // Middle
                const endX = targetNode.position.x; // Left edge
                const endY = targetNode.position.y + 50; // Middle

                const dx = endX - startX;
                const controlX = startX + dx * 0.5;
                const controlY = Math.min(startY, endY) - 60;

                return (
                  <g key={edge.id}>
                    {/* Invisible wider path for easier clicking */}
                    <path
                      d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                      stroke="transparent"
                      strokeWidth="15"
                      fill="none"
                      className="cursor-pointer"
                      onClick={() => {
                        if (confirm('Delete this connection?')) {
                          deleteEdge(edge.id);
                        }
                      }}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    />
                    {/* Visible connection line */}
                    <path
                      d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                      stroke="#6b7280"
                      strokeWidth="2.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      className="hover:stroke-red-500 transition-colors"
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                );
              })}

              {/* Temporary connection line while dragging */}
              {connectingSource && connectingPosition && (() => {
                const sourceNode = nodes.find(n => n.id === connectingSource);
                if (!sourceNode) return null;

                const startX = sourceNode.position.x + 140;
                const startY = sourceNode.position.y + 50;
                const endX = connectingPosition.x;
                const endY = connectingPosition.y;

                const dx = endX - startX;
                const controlX = startX + dx * 0.5;
                const controlY = Math.min(startY, endY) - 60;

                const isValid = hoveredTarget && hoveredTarget !== connectingSource;
                const strokeColor = isValid ? "#10b981" : "#3b82f6";
                const markerId = isValid ? "arrowhead-valid" : "arrowhead-connecting";

                return (
                  <path
                    d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeDasharray="5,5"
                    fill="none"
                    markerEnd={`url(#${markerId})`}
                  />
                );
              })()}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const nodeType = nodeTypes.find(nt => nt.type === node.type);
              const hasInput = node.type !== "TRIGGER";
              const canConnect = connectingSource && connectingSource !== node.id && hasInput;
              const isInvalidTarget = connectingSource && (connectingSource === node.id || !hasInput);
              
              return (
                <div
                  key={node.id}
                  className={`absolute cursor-move p-4 border-2 rounded-xl shadow-md min-w-[140px] bg-white transition-all ${
                    selectedNode === node.id 
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105'
                      : hoveredTarget === node.id && canConnect
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : hoveredTarget === node.id && isInvalidTarget
                      ? 'border-red-500 bg-red-50 shadow-lg'
                      : 'border-gray-300 hover:border-indigo-400 hover:shadow-lg'
                  }`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    zIndex: selectedNode === node.id ? 10 : 2,
                  }}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                >
                  {/* Input handle (left side) */}
                  {hasInput && (
                    <div
                      className={`connection-handle absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 cursor-crosshair z-20 transition-all ${
                        hoveredTarget === node.id && canConnect
                          ? 'bg-green-500 border-green-600 scale-125 shadow-lg'
                          : hoveredTarget === node.id && isInvalidTarget
                          ? 'bg-red-500 border-red-600 scale-125 shadow-lg'
                          : connectingSource && canConnect
                          ? 'bg-indigo-500 border-indigo-600 scale-110'
                          : 'bg-white border-gray-400 hover:border-indigo-500 hover:bg-indigo-100 hover:scale-110'
                      }`}
                      onMouseDown={(e) => {
                        if (connectingSource) {
                          handleConnectionEnd(node.id, e);
                        }
                      }}
                      onMouseEnter={() => {
                        if (connectingSource) {
                          setHoveredTarget(node.id);
                        }
                      }}
                      onMouseLeave={() => {
                        if (connectingSource) {
                          setHoveredTarget(null);
                        }
                      }}
                      title="Connect to this node"
                    />
                  )}
                  
                  {/* Output handle (right side) */}
                  <div
                    className={`connection-handle absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 cursor-crosshair z-20 transition-all ${
                      connectingSource === node.id
                        ? 'bg-indigo-500 border-indigo-600 scale-125 shadow-lg'
                        : 'bg-white border-gray-400 hover:border-indigo-500 hover:bg-indigo-100 hover:scale-110'
                    }`}
                    onMouseDown={(e) => handleConnectionStart(node.id, e)}
                    title="Drag to connect"
                  />
                  
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">{nodeType?.icon}</span>
                    <span className="font-semibold text-sm text-gray-900">{node.name}</span>
                  </div>
                  <div className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${nodeType?.color}`}>
                    {node.type}
                  </div>
                  
                  {selectedNode === node.id && (
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="secondary" className="text-xs flex-1">
                        Configure
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                                                onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Node Properties</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {(() => {
              const node = nodes.find(n => n.id === selectedNode);
              if (!node) return null;

              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Node Name
                    </label>
                    <input
                      type="text"
                      value={node.name}
                      onChange={(e) => {
                        setNodes(nodes.map(n => 
                          n.id === selectedNode ? { ...n, name: e.target.value } : n
                        ));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  {node.type === "TRIGGER" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={node.data.url || ""}
                        onChange={(e) => {
                          setNodes(nodes.map(n => 
                            n.id === selectedNode 
                              ? { ...n, data: { ...n.data, url: e.target.value } } 
                              : n
                          ));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {node.type === "AI_STEP" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Action
                      </label>
                      <select
                        value={node.data.action || "classify"}
                        onChange={(e) => {
                          setNodes(nodes.map(n => 
                            n.id === selectedNode 
                              ? { ...n, data: { ...n.data, action: e.target.value } } 
                              : n
                          ));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="classify">Classify</option>
                        <option value="summarize">Summarize</option>
                        <option value="extract">Extract</option>
                        <option value="translate">Translate</option>
                      </select>
                    </div>
                  )}

                  {node.type === "SLACK" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Channel
                        </label>
                        <input
                          type="text"
                          value={node.data.channel || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, channel: e.target.value } }
                                : n
                            ));
                          }}
                          placeholder="#general"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message Template
                        </label>
                        <textarea
                          value={node.data.message || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, message: e.target.value } }
                                : n
                            ));
                          }}
                          rows={3}
                          placeholder="Hello! New {{type}} received: {{content}}"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {node.type === "GMAIL" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To
                        </label>
                        <input
                          type="email"
                          value={node.data.to || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, to: e.target.value } }
                                : n
                            ));
                          }}
                          placeholder="recipient@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={node.data.subject || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, subject: e.target.value } }
                                : n
                            ));
                          }}
                          placeholder="Flow Notification"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Body
                        </label>
                        <textarea
                          value={node.data.body || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, body: e.target.value } }
                                : n
                            ));
                          }}
                          rows={4}
                          placeholder="Email body content..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {node.type === "HTTP" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Method
                        </label>
                        <select
                          value={node.data.method || "GET"}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, method: e.target.value } }
                                : n
                            ));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL
                        </label>
                        <input
                          type="url"
                          value={node.data.url || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, url: e.target.value } }
                                : n
                            ));
                          }}
                          placeholder="https://api.example.com/endpoint"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Headers (JSON)
                        </label>
                        <textarea
                          value={node.data.headers || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, headers: e.target.value } }
                                : n
                            ));
                          }}
                          rows={2}
                          placeholder='{"Content-Type": "application/json"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Body (JSON)
                        </label>
                        <textarea
                          value={node.data.body || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, body: e.target.value } }
                                : n
                            ));
                          }}
                          rows={3}
                          placeholder='{"key": "value"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {node.type === "WEBHOOK" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target URL
                        </label>
                        <input
                          type="url"
                          value={node.data.url || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, url: e.target.value } }
                                : n
                            ));
                          }}
                          placeholder="https://example.com/webhook"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payload Template (JSON)
                        </label>
                        <textarea
                          value={node.data.payload || ""}
                          onChange={(e) => {
                            setNodes(nodes.map(n =>
                              n.id === selectedNode
                                ? { ...n, data: { ...n.data, payload: e.target.value } }
                                : n
                            ));
                          }}
                          rows={3}
                          placeholder='{"event": "{{type}}", "data": "{{content}}"}'
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlowBuilderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading flow builder...</div>
      </div>
    }>
      <FlowBuilderContent />
    </Suspense>
  );
}
