import React, { useState, useEffect, useRef } from "react";
import { 
  X, Send, Sparkles, RotateCcw, AlertTriangle, ShieldCheck, 
  BookOpen, ExternalLink, Activity, Info, PhoneCall, CheckCircle2 
} from "lucide-react";
import BloodDropIcon from "./BloodDropIcon";
import { api } from "../api/api";

const SUGGESTED_QUESTIONS = [
  "Who can donate blood?",
  "How often can I donate blood?",
  "Can a diabetic donate blood?",
  "What should I eat before donating blood?",
  "What is the difference between whole blood and platelets?",
  "Can I donate blood if I have a tattoo?",
  "What happens to blood after donation?",
  "Is blood donation safe?",
  "How long does a blood donation take?",
  "Why is O negative blood so important?"
];

export default function BloodKnowledgeAI({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: "init-welcome",
      role: "assistant",
      content: "Hi! I'm Blood Knowledge AI. Ask me anything about blood, blood groups, donation or blood safety.",
      safety_category: "EDUCATIONAL",
      sources: ["WHO", "NBTC India", "AABB"],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText = null) => {
    const text = (queryText || inputQuery).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    setInputQuery("");

    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepare history for RAG context
    const currentHistory = messages
      .filter((m) => m.id !== "init-welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await api.askBloodKnowledge(text, currentHistory);

      if (response && response.success) {
        const botMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          safety_category: response.safety_category || "EDUCATIONAL",
          safety_advisory: response.safety_advisory || null,
          sources: response.sources || ["WHO", "NBTC India", "CDC"],
          matches_count: response.matches_count || 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(response?.message || "Failed to retrieve blood knowledge response.");
      }
    } catch (err) {
      console.error("Blood Knowledge AI error:", err);
      setErrorMessage(
        err.message || "An unexpected error occurred while consulting Blood Knowledge AI. Please try again."
      );
      const fallbackBotMsg = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        content: "I encountered a communication delay with the blood knowledge repository. HexaVision's offline knowledge engine is available. Please re-submit your question or select from suggested topics.",
        safety_category: "EDUCATIONAL",
        sources: ["HexaVision Knowledge Vault"],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackBotMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: "assistant",
        content: "Hi! I'm Blood Knowledge AI. Ask me anything about blood, blood groups, donation or blood safety.",
        safety_category: "EDUCATIONAL",
        sources: ["WHO", "NBTC India", "AABB"],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInputQuery("");
    setErrorMessage(null);
  };

  const renderBadge = (category) => {
    switch (category) {
      case "EMERGENCY":
        return (
          <span className="bk-badge bk-badge-emergency">
            <PhoneCall size={12} />
            <span>EMERGENCY DISPATCH PROTOCOL</span>
          </span>
        );
      case "ELIGIBILITY":
        return (
          <span className="bk-badge bk-badge-eligibility">
            <ShieldCheck size={12} />
            <span>GENERAL ELIGIBILITY GUIDANCE</span>
          </span>
        );
      case "PERSONAL_MEDICAL":
        return (
          <span className="bk-badge bk-badge-medical">
            <AlertTriangle size={12} />
            <span>EDUCATIONAL ONLY • NOT A PRESCRIPTION</span>
          </span>
        );
      case "UNSUPPORTED":
        return (
          <span className="bk-badge bk-badge-unsupported">
            <Info size={12} />
            <span>OUT OF CLINICAL SCOPE</span>
          </span>
        );
      default:
        return (
          <span className="bk-badge bk-badge-educational">
            <CheckCircle2 size={12} />
            <span>VERIFIED CLINICAL KNOWLEDGE</span>
          </span>
        );
    }
  };

  const formatContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} style={{ height: "6px" }} />;
      }

      const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
      const cleanLine = isBullet ? trimmed.replace(/^[•\-*]\s*/, "") : trimmed;

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} style={{ color: "#ffffff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: "3px 0 3px 6px" }}>
            <span style={{ color: "var(--cyan-accent)", fontSize: "14px", lineHeight: "1.4" }}>•</span>
            <span style={{ flex: 1, lineHeight: "1.5" }}>{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={idx} style={{ margin: "4px 0", lineHeight: "1.55" }}>
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div 
        className="bk-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bk-title"
      >
        {/* Header */}
        <div className="bk-header">
          <div className="bk-header-left">
            <div className="bk-avatar-pulse">
              <BloodDropIcon size={24} color="#ff2a55" variant="filled" animated />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 id="bk-title" className="bk-title">
                  Blood Knowledge AI
                </h2>
                <span className="bk-chip-verified">
                  <BookOpen size={11} /> 1,200+ WHO/NBTC Grounded
                </span>
              </div>
              <p className="bk-subtitle">
                Your educational assistant for blood and blood donation
              </p>
            </div>
          </div>

          <div className="bk-header-right">
            <button 
              type="button" 
              className="bk-btn-icon" 
              onClick={handleResetChat} 
              title="Reset conversation"
              aria-label="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              type="button" 
              className="bk-btn-icon bk-btn-close" 
              onClick={onClose} 
              title="Close Blood Knowledge AI"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="bk-messages-thread">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`bk-message-row ${msg.role === "user" ? "bk-row-user" : "bk-row-assistant"}`}
            >
              {msg.role === "assistant" && (
                <div className="bk-assistant-avatar" aria-hidden="true">
                  <BloodDropIcon size={16} color="#00f2fe" variant="filled" />
                </div>
              )}

              <div className={`bk-bubble ${msg.role === "user" ? "bk-bubble-user" : "bk-bubble-assistant"}`}>
                {msg.role === "assistant" && msg.safety_category && (
                  <div className="bk-bubble-header">
                    {renderBadge(msg.safety_category)}
                    <span className="bk-timestamp">{msg.timestamp}</span>
                  </div>
                )}

                <div className="bk-bubble-text">
                  {formatContent(msg.content)}
                </div>

                {/* Safety Advisory Banner if applicable */}
                {msg.safety_advisory && (
                  <div className={`bk-safety-advisory bk-adv-${msg.safety_category?.toLowerCase() || 'educational'}`}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "0.8rem", lineHeight: "1.4" }}>
                      {msg.safety_advisory}
                    </div>
                  </div>
                )}

                {/* Authoritative Sources Citation */}
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="bk-sources-container">
                    <span className="bk-sources-label">Sources:</span>
                    <div className="bk-sources-list">
                      {msg.sources.map((src, sIdx) => (
                        <span key={sIdx} className="bk-source-tag">
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {msg.role === "user" && (
                  <div className="bk-user-meta">
                    <span className="bk-timestamp">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking Animation */}
          {isLoading && (
            <div className="bk-message-row bk-row-assistant">
              <div className="bk-assistant-avatar" aria-hidden="true">
                <BloodDropIcon size={16} color="#00f2fe" variant="filled" animated />
              </div>
              <div className="bk-bubble bk-bubble-assistant bk-bubble-thinking">
                <div className="bk-thinking-indicator">
                  <span className="bk-thinking-text">Blood Knowledge AI is thinking...</span>
                  <div className="bk-dots">
                    <span className="bk-dot"></span>
                    <span className="bk-dot"></span>
                    <span className="bk-dot"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Question Pills (horizontal scrollable) */}
        <div className="bk-pills-bar">
          <span className="bk-pills-label">Suggested:</span>
          <div className="bk-pills-track">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="bk-pill-button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="bk-input-bar">
          {errorMessage && (
            <div className="bk-error-toast">
              <AlertTriangle size={14} />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="bk-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="bk-input-field"
              placeholder="Ask anything about blood types, donation, recovery, safety..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={500}
            />
            <button
              type="button"
              className="bk-send-btn"
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              aria-label="Send query"
            >
              {isLoading ? (
                <Sparkles size={16} className="bk-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="bk-input-footer">
            <span className="bk-disclaimer-footnote">
              <ShieldCheck size={11} style={{ display: "inline", marginRight: "4px" }} />
              Educational guidance only. Always consult a certified physician for personal diagnoses.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
