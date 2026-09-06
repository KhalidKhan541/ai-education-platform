'use client';

import { useState, useRef, useEffect } from 'react';
import { useTutorStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, Bot, User, Loader2, Sparkles, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';

export function TutorChat() {
  const { messages, isLoading, sendMessage } = useTutorStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    'Explain React hooks in simple terms',
    'What is the difference between useState and useEffect?',
    'Give me a practice exercise for state management',
  ];

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col rounded-xl border border-slate-200 bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-4',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-900'
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
                {message.role === 'assistant' && (
                  <div className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2">
                    <button className="text-slate-400 hover:text-slate-600">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button className="text-slate-400 hover:text-green-600">
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button className="text-slate-400 hover:text-red-600">
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Prompts */}
      {messages.length <= 1 && (
        <div className="border-t border-slate-100 px-6 py-3">
          <p className="mb-2 text-xs font-medium text-slate-500">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI tutor anything..."
              rows={1}
              className="h-10 min-h-[40px] max-h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          AI responses may be inaccurate. Always verify important information.
        </p>
      </div>
    </div>
  );
}
