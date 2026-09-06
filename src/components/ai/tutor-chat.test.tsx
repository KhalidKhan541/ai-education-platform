import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TutorChatProps {
  conversationId?: string;
  onSendMessage?: (message: string) => Promise<void>;
  messages?: Message[];
  isLoading?: boolean;
  courseContext?: string;
}

function TutorChat({
  onSendMessage,
  messages = [],
  isLoading = false,
  courseContext,
}: TutorChatProps) {
  const [input, setInput] = React.useState("");
  const [localMessages, setLocalMessages] = React.useState<Message[]>(messages);

  React.useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      await onSendMessage?.(userMessage.content);
    } catch {
      // Error handled silently
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div data-testid="tutor-chat" className="tutor-chat">
      <div data-testid="chat-header" className="header">
        <h3>AI Tutor</h3>
        {courseContext && <span data-testid="course-context">{courseContext}</span>}
      </div>

      <div data-testid="messages-container" className="messages">
        {localMessages.length === 0 && (
          <div data-testid="empty-state">
            Ask me anything about the course material!
          </div>
        )}

        {localMessages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`message-${msg.role}`}
            className={`message message-${msg.role}`}
          >
            <span data-testid={`message-role-${msg.id}`}>{msg.role}</span>
            <p data-testid={`message-content-${msg.id}`}>{msg.content}</p>
            <span data-testid={`message-time-${msg.id}`}>
              {msg.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}

        {isLoading && (
          <div data-testid="loading-indicator" className="loading">
            <span className="typing-indicator">AI is thinking...</span>
          </div>
        )}
      </div>

      <div data-testid="chat-input" className="input-container">
        <textarea
          data-testid="message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={3}
          disabled={isLoading}
        />
        <button
          data-testid="send-button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

describe("TutorChat", () => {
  const mockMessages: Message[] = [
    {
      id: "msg-1",
      role: "user",
      content: "What is a closure?",
      timestamp: new Date("2026-01-01T10:00:00"),
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "A closure is a function that has access to variables from its outer scope.",
      timestamp: new Date("2026-01-01T10:00:05"),
    },
  ];

  it("should render chat container", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("tutor-chat")).toBeInTheDocument();
  });

  it("should render header", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("chat-header")).toHaveTextContent("AI Tutor");
  });

  it("should show course context when provided", () => {
    render(<TutorChat courseContext="JavaScript Fundamentals" />);
    expect(screen.getByTestId("course-context")).toHaveTextContent("JavaScript Fundamentals");
  });

  it("should show empty state when no messages", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("should render messages", () => {
    render(<TutorChat messages={mockMessages} />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("message-user")).toHaveLength(1);
    expect(screen.getAllByTestId("message-assistant")).toHaveLength(1);
  });

  it("should display message content", () => {
    render(<TutorChat messages={mockMessages} />);
    expect(screen.getByTestId("message-content-msg-1")).toHaveTextContent("What is a closure?");
    expect(screen.getByTestId("message-content-msg-2")).toHaveTextContent("A closure is a function");
  });

  it("should render message input", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("should update input on typing", () => {
    render(<TutorChat />);
    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Hello AI" } });
    expect(input).toHaveValue("Hello AI");
  });

  it("should call onSendMessage when sending", async () => {
    const onSendMessage = jest.fn().mockResolvedValue(undefined);
    render(<TutorChat onSendMessage={onSendMessage} />);

    fireEvent.change(screen.getByTestId("message-input"), {
      target: { value: "What is React?" },
    });
    fireEvent.click(screen.getByTestId("send-button"));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith("What is React?");
    });
  });

  it("should clear input after sending", async () => {
    const onSendMessage = jest.fn().mockResolvedValue(undefined);
    render(<TutorChat onSendMessage={onSendMessage} />);

    const input = screen.getByTestId("message-input");
    fireEvent.change(input, { target: { value: "Question" } });
    fireEvent.click(screen.getByTestId("send-button"));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("should not send empty messages", () => {
    const onSendMessage = jest.fn();
    render(<TutorChat onSendMessage={onSendMessage} />);

    fireEvent.click(screen.getByTestId("send-button"));
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("should send on Enter key", async () => {
    const onSendMessage = jest.fn().mockResolvedValue(undefined);
    render(<TutorChat onSendMessage={onSendMessage} />);

    fireEvent.change(screen.getByTestId("message-input"), {
      target: { value: "Question" },
    });
    fireEvent.keyDown(screen.getByTestId("message-input"), { key: "Enter" });

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalled();
    });
  });

  it("should not send on Shift+Enter", () => {
    const onSendMessage = jest.fn();
    render(<TutorChat onSendMessage={onSendMessage} />);

    fireEvent.change(screen.getByTestId("message-input"), {
      target: { value: "Question" },
    });
    fireEvent.keyDown(screen.getByTestId("message-input"), { key: "Enter", shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("should show loading state", () => {
    render(<TutorChat isLoading={true} />);
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeDisabled();
    expect(screen.getByTestId("message-input")).toBeDisabled();
  });

  it("should disable send button when input is empty", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("send-button")).toBeDisabled();
  });

  it("should render send button text", () => {
    render(<TutorChat />);
    expect(screen.getByTestId("send-button")).toHaveTextContent("Send");
  });

  it("should show Sending... when loading", () => {
    render(<TutorChat isLoading={true} />);
    expect(screen.getByTestId("send-button")).toHaveTextContent("Sending...");
  });
});
