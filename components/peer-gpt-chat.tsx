"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, ArrowUp, Download } from "lucide-react"
import { PeerGPTLogo } from "./peer-gpt-logo"
import { ChatMessage } from "./chat-message"
import { TypingIndicator } from "./typing-indicator"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

interface PeerGPTChatProps {
  onClose: () => void
}

const WELCOME_MESSAGE = `👋 Hey there! Welcome to Peer Wealth.
I can help you with a few things today:

🧭 Want to know what Peer Wealth is and how it works?

⚙️ Stuck on something technical or not sure how part of the platform works?

💰 Looking for ways to boost your earnings or build a smart strategy to make the most of your referrals?

Just ask — I'm here to guide you through it all!
What would you like help with today?`

export function PeerGPTChat({ onClose }: PeerGPTChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleSendMessage = async () => {
    if (inputValue.trim() === "") return
    if (!user?.id) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "You need to be logged in to use this feature.",
          timestamp: new Date(),
        },
      ])
      return
    }

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)
    setIsError(false)

    try {
      // Call API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputValue,
          userId: user?.id,
        }),
      })

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text()
        console.error("API error response:", errorText)
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      // Parse JSON with error handling
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError)
        throw new Error("Failed to parse response from server")
      }

      // Add bot response with typing effect
      setTimeout(() => {
        setIsTyping(false)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply || "Sorry, I couldn't generate a response. Please try again.",
            timestamp: new Date(),
          },
        ])
      }, 1500) // Simulate typing delay
    } catch (error) {
      console.error("Error sending message:", error)
      setIsTyping(false)
      setIsError(true)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error connecting to my brain. Please try again in a moment.",
          timestamp: new Date(),
        },
      ])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDownloadExcel = () => {
    // This would be implemented to generate an Excel file with user data
    alert("Excel download functionality will be implemented")
  }

  const handleDownloadPDF = () => {
    // This would be implemented to generate a PDF with user data
    alert("PDF download functionality will be implemented")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e21] rounded-2xl shadow-lg w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#2e3137] p-4 flex items-center justify-center relative">
          <PeerGPTLogo />
          {user?.id && (
            <div className="absolute right-12 text-white text-xs bg-gray-700 px-2 py-1 rounded">
              ID: {user.id.substring(0, 8)}...
            </div>
          )}
          <button onClick={onClose} className="absolute right-4 text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden h-[70vh]">
          {/* Sidebar */}
          <div className="w-16 bg-[#2e3137] flex flex-col items-center py-4">
            <button className="text-gray-400 hover:text-white mb-4">
              <X size={20} />
            </button>
            <div className="h-full border-r border-gray-700"></div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#6b617a] to-[#c5c6c8]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[calc(70vh-180px)]">
              {messages.map((message, index) => (
                <ChatMessage key={index} role={message.role} content={message.content} timestamp={message.timestamp} />
              ))}
              {isTyping && <TypingIndicator />}
              {isError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> There was a problem connecting to the assistant.</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4">
              <div className="bg-white rounded-xl p-2 mb-2">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Bot anything about your account or what is the best strategy for you to make money on this platform"
                  className="w-full bg-transparent text-black p-2 outline-none resize-none min-h-[80px] max-h-[200px]"
                  rows={1}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendMessage}
                    disabled={inputValue.trim() === "" || isTyping}
                    className={`${
                      inputValue.trim() === "" || isTyping ? "text-gray-300" : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadExcel}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    <Download size={14} />
                    Download Excel
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-md text-sm flex items-center gap-1"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={inputValue.trim() === "" || isTyping}
                  className={`px-4 py-1 rounded-md text-sm ${
                    inputValue.trim() === "" || isTyping
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-white hover:bg-gray-100 text-black"
                  }`}
                >
                  {isTyping ? "Thinking..." : "Ask / Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
