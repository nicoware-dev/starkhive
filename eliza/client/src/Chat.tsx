import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS } from "@/config";
import "./App.css";

type TextResponse = {
    text: string;
    user: string;
};

interface Character {
    name: string;
}

interface AgentResponse {
    id: string;
    character: Character;
}

interface Agent {
    id: string;
    name: string;
}

export default function Chat() {
    const { agentId } = useParams();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<TextResponse[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch agent details
    const { data: agent, isLoading, error } = useQuery<Agent>({
        queryKey: ["agent", agentId],
        queryFn: async () => {
            try {
                const res = await fetch(API_ENDPOINTS.agentDetails(agentId!));
                if (!res.ok) {
                    throw new Error(`Failed to fetch agent: ${res.status}`);
                }
                const data: AgentResponse = await res.json();
                return {
                    id: data.id,
                    name: data.character.name
                };
            } catch (err) {
                console.error('Error fetching agent:', err);
                throw err;
            }
        },
        enabled: !!agentId,
        retry: 1,
    });

    // Clear messages when agent changes
    useEffect(() => {
        setMessages([]);
    }, [agentId]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [scrollToBottom]);

    const mutation = useMutation({
        mutationFn: async (text: string) => {
            try {
                const res = await fetch(API_ENDPOINTS.messages(agentId!), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text,
                        userId: "user",
                        roomId: `default-room-${agentId}`,
                    }),
                });
                if (!res.ok) {
                    throw new Error(`Failed to send message: ${res.status}`);
                }
                return res.json() as Promise<TextResponse[]>;
            } catch (err) {
                console.error('Error sending message:', err);
                throw err;
            }
        },
        onSuccess: (data) => {
            setMessages((prev) => [...prev, ...data]);
            scrollToBottom();
        },
        onError: (error) => {
            console.error('Mutation error:', error);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: TextResponse = {
            text: input,
            user: "user",
        };
        setMessages((prev) => [...prev, userMessage]);

        mutation.mutate(input);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Agent header - fixed height */}
            <div className="flex-none border-b border-[#27272A] bg-[#121212]/95 backdrop-blur supports-[backdrop-filter]:bg-[#121212]/60">
                <div className="flex items-center justify-center h-12">
                    <span className="font-medium">
                        {isLoading ? 'Loading...' : agent?.name || 'No agent selected'}
                    </span>
                </div>
            </div>

            {/* Messages area - flexible height with scroll */}
            <div className="flex-1 overflow-y-auto">
                {messages.length > 0 ? (
                    <div className="p-4">
                        <div className="max-w-3xl mx-auto space-y-4">
                            {messages.map((message, idx) => (
                                <div
                                    key={`${message.user}-${idx}-${message.text}`}
                                    className={`flex ${
                                        message.user === "user"
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-2 break-words ${
                                            message.user === "user"
                                                ? "bg-[#7f00ff] text-white"
                                                : "bg-[#1a1a1a] border border-[#27272A]"
                                        }`}
                                        style={{
                                            overflowWrap: 'break-word',
                                            wordBreak: 'break-word',
                                            hyphens: 'auto',
                                        }}
                                    >
                                        {message.user === "user" ? (
                                            <div className="whitespace-pre-wrap">{message.text}</div>
                                        ) : (
                                            <div className="prose prose-invert prose-sm max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        // Override default elements with custom styling
                                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                        a: ({node, ...props}) => <a className="text-[#7f00ff] hover:underline" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                                        code: ({node, inline, ...props}: {node: any, inline?: boolean, [key: string]: any}) =>
                                                            inline ? (
                                                                <code className="bg-black/30 rounded px-1 py-0.5" {...props} />
                                                            ) : (
                                                                <code className="block bg-black/30 rounded p-2 my-2 overflow-x-auto" {...props} />
                                                            ),
                                                        pre: ({node, ...props}) => <pre className="bg-black/30 rounded p-2 my-2 overflow-x-auto" {...props} />,
                                                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2" {...props} />,
                                                        h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2" {...props} />,
                                                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-2" {...props} />,
                                                        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[#7f00ff] pl-4 my-2 italic" {...props} />,
                                                        table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-[#27272A]" {...props} /></div>,
                                                        th: ({node, ...props}) => <th className="px-3 py-2 text-left text-sm font-semibold" {...props} />,
                                                        td: ({node, ...props}) => <td className="px-3 py-2 text-sm" {...props} />,
                                                    }}
                                                >
                                                    {message.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-muted-foreground text-center">
                            {agent ? (
                                `No messages yet. Start a conversation with ${agent.name}!`
                            ) : (
                                "Please select an agent to start chatting"
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Input form - fixed height */}
            <div className="flex-none border-t border-[#27272A] bg-[#121212]/80 backdrop-blur supports-[backdrop-filter]:bg-[#121212]/60">
                <div className="max-w-3xl mx-auto p-4">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isLoading ? "Loading..." : agent ? `Message ${agent.name}...` : "Select an agent..."}
                            className="flex-1 bg-[#1a1a1a] border-[#27272A] focus:border-[#7f00ff] focus:ring-[#7f00ff]"
                            disabled={isLoading || mutation.isPending || !agent}
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || mutation.isPending || !agent}
                            className="bg-[#7f00ff] text-white hover:bg-[#7f00ff]/90"
                        >
                            {mutation.isPending ? "..." : "Send"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
