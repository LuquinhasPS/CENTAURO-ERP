import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Trash2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import './AICopilotWidget.css';

const AICopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente virtual do Centauro ERP. Como posso ajudar com seus projetos ou contratos hoje?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // API call to backend
      const response = await api.post('/api/ai/chat', {
        message: userMessage.content,
        history: messages
      });

      const aiMessage = {
        role: 'assistant',
        content: response.data.response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickSuggestion = (text) => {
    setInputText(text);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const clearHistory = () => {
    setMessages([
      { role: 'assistant', content: 'Histórico limpo. Como posso ajudar?' }
    ]);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-1 z-50 animate-bounce-slow"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-widget-container">

          {/* Header */}
          <div className="ai-widget-header">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20 text-white">
                <Bot size={20} className="" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-indigo-500">Centauro AI</h3>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium ml-0.5">Assistant</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={clearHistory}
                className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 transition-all"
                title="Limpar Conversa"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={toggleChat}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="ai-messages-area">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} `}
              >
                <div
                  className={`ai - message - bubble ${msg.role === 'user' ? 'ai-message-user' : 'ai-message-bot'
                    } `}
                >
                  <div className={`prose prose - sm dark: prose - invert max - w - none leading - relaxed break-words ${msg.role === 'user' ? 'prose-headings:text-white prose-p:text-white prose-strong:text-white' : ''} `}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        strong: ({ children }) => <span className={`font - bold ${msg.role === 'user' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'} `}>{children}</span>,
                        table: ({ children }) => <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-700"><table className="min-w-full text-xs text-left">{children}</table></div>,
                        th: ({ children }) => <th className="px-3 py-2 bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200">{children}</th>,
                        td: ({ children }) => <td className="px-3 py-2 border-t border-slate-100 dark:border-slate-700">{children}</td>,
                        code: ({ children }) => <code className={`px - 1 py - 0.5 rounded text - xs ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 font-mono text-pink-500'} `}>{children}</code>
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="ai-loading-bubble">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions & Input */}
          <div className="ai-footer-area">
            {/* Quick Suggestions */}
            {messages.length < 5 && !isLoading && (
              <div className="ai-suggestions-container">
                {['Resumir Projetos', 'Status da Frota', 'Contratos Vencendo', 'Previsão de Faturamento'].map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleQuickSuggestion(sug)}
                    className="ai-suggestion-btn"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            <div className="ai-input-container">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre projetos, financeiro..."
                rows={1}
                className="ai-input-textarea"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className="ai-send-btn"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send size={18} className={inputText.trim() ? 'ml-0.5' : ''} />
                )}
              </button>
            </div>
            <div className="text-center mt-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium h-[15px]">
                {isLoading ? 'Analisando dados do ERP...' : 'Powered by Gemini 1.5 Flash'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AICopilotWidget;
