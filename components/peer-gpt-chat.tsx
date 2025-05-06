"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, ArrowUp } from "lucide-react"
import { PeerGPTLogo } from "./peer-gpt-logo"
import { ChatMessage } from "./chat-message"
import { TypingIndicator } from "./typing-indicator"
import { useAuth } from "@/contexts/auth-context"

// Assistant names based on country
const SOUTH_AFRICA_NAMES = ["Tshepo", "Vusi"]
const NAMIBIA_NAMES = ["Natangwe", "Ousie Ribs"]
const DEFAULT_NAMES = ["Gidoen", "Prosper"]

// Country-specific greetings
const GREETINGS = {
  southAfrica: {
    formal: ["Sawubona", "Dumela", "Molo"],
    casual: ["Howzit", "Eita", "Hola"],
    phrases: [
      "Hope you're lekker today!",
      "Let's make a plan to grow your wealth!",
      "Ready to help you earn some moola!",
      "Let's chat about your Peer Wealth journey, hey?",
    ],
  },
  namibia: {
    formal: ["Ondjeni", "Moro", "Ongahepo"],
    casual: ["Hallo", "Wazup", "Howzit"],
    phrases: [
      "Hope you're having a great day in the Land of the Brave!",
      "Let's talk about growing your wealth, Namibian style!",
      "Ready to help you with your Peer Wealth journey!",
      "Let's make your investments work for you!",
    ],
  },
  default: {
    formal: ["Hello", "Greetings", "Welcome"],
    casual: ["Hi there", "Hey", "Hello"],
    phrases: [
      "Hope you're having a great day!",
      "Let's talk about growing your wealth!",
      "Ready to help you with your Peer Wealth journey!",
      "Let's make your investments work for you!",
    ],
  },
}

// Update the getAssistantName function to handle country names more reliably
const getAssistantName = (country?: string, userId?: string): string => {
  // Use userId as part of the seed for consistent but different selection per user
  const seed = userId || Math.random().toString()
  const seedNum = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)

  let nameList: string[]
  // Normalize country name for more reliable matching
  const normalizedCountry = country?.trim().toLowerCase() || ""

  if (normalizedCountry === "south africa" || normalizedCountry === "za" || normalizedCountry === "rsa") {
    nameList = SOUTH_AFRICA_NAMES
    console.log("Selected South African name list for country:", country)
  } else if (normalizedCountry === "namibia" || normalizedCountry === "na") {
    nameList = NAMIBIA_NAMES
    console.log("Selected Namibian name list for country:", country)
  } else {
    nameList = DEFAULT_NAMES
    console.log("Selected default name list for country:", country)
  }

  // Select a name based on the seed
  const selectedName = nameList[seedNum % nameList.length]
  console.log(`Selected name: ${selectedName} for country: ${country}`)
  return selectedName
}

// Function to get country-specific greetings
const getCountryGreetings = (country?: string, seed?: string) => {
  const seedNum = seed
    ? Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : Math.floor(Math.random() * 1000)

  let greetings
  const normalizedCountry = country?.trim().toLowerCase() || ""

  if (normalizedCountry === "south africa" || normalizedCountry === "za" || normalizedCountry === "rsa") {
    greetings = GREETINGS.southAfrica
  } else if (normalizedCountry === "namibia" || normalizedCountry === "na") {
    greetings = GREETINGS.namibia
  } else {
    greetings = GREETINGS.default
  }

  // Select greetings based on seed for consistency
  const formalGreeting = greetings.formal[seedNum % greetings.formal.length]
  const casualGreeting = greetings.casual[seedNum % greetings.casual.length]
  const phrase = greetings.phrases[seedNum % greetings.phrases.length]

  return { formalGreeting, casualGreeting, phrase }
}

const getWelcomeMessage = (assistantName: string, country?: string, userId?: string) => {
  const { formalGreeting, casualGreeting, phrase } = getCountryGreetings(country, userId)

  return `${formalGreeting}! ${casualGreeting}, I'm ${assistantName}, your Peer Wealth assistant.

${phrase}

I can help you with:

🧭 Understanding how Peer Wealth works and its features

⚙️ Technical support and platform navigation

💰 Strategies to maximize your earnings through referrals and vesting

Just ask me anything — I'm here to guide you through it all!`
}

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

interface PeerGPTChatProps {
  onClose: () => void
}

export function PeerGPTChat({ onClose }: PeerGPTChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isError, setIsError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [assistantName, setAssistantName] = useState<string>("Assistant")

  // Load saved messages and assistant name from localStorage when component mounts
  useEffect(() => {
    if (user?.id) {
      // Load assistant name
      const savedName = localStorage.getItem(`peerGPT_assistantName_${user.id}`)
      const newAssistantName = savedName || getAssistantName(user?.country, user.id)
      setAssistantName(newAssistantName)

      // Save the name if it wasn't already saved
      if (!savedName) {
        localStorage.setItem(`peerGPT_assistantName_${user.id}`, newAssistantName)
      }

      const savedMessages = localStorage.getItem(`peerGPT_messages_${user.id}`)
      if (savedMessages) {
        try {
          // Parse the saved messages and convert string timestamps back to Date objects
          const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          setMessages(parsedMessages)
        } catch (error) {
          console.error("Error parsing saved messages:", error)
          // If there's an error parsing, start with the welcome message
          setMessages([
            {
              role: "assistant",
              content: getWelcomeMessage(newAssistantName, user?.country, user.id),
              timestamp: new Date(),
            },
          ])
        }
      } else {
        // If no saved messages, start with the welcome message
        setMessages([
          {
            role: "assistant",
            content: getWelcomeMessage(newAssistantName, user?.country, user.id),
            timestamp: new Date(),
          },
        ])
      }
    }
  }, [user?.id, user?.country])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      localStorage.setItem(`peerGPT_messages_${user.id}`, JSON.stringify(messages))
    }
  }, [messages, user?.id])

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
          assistantName: assistantName, // Pass the assistant name to the API
          country: user?.country, // Pass the country to the API
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
          content: `Sorry, I encountered an error connecting to my brain. Please try again in a moment.`,
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

  const handleClearChat = () => {
    if (user?.id && window.confirm("Are you sure you want to clear the chat history?")) {
      // Generate a new assistant name
      const newAssistantName = getAssistantName(user?.country, user.id + Date.now())
      setAssistantName(newAssistantName)
      localStorage.setItem(`peerGPT_assistantName_${user.id}`, newAssistantName)

      // Clear messages and start with welcome
      localStorage.removeItem(`peerGPT_messages_${user.id}`)
      setMessages([
        {
          role: "assistant",
          content: getWelcomeMessage(newAssistantName, user?.country, user.id + Date.now()),
          timestamp: new Date(),
        },
      ])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e21] rounded-xl shadow-lg w-full max-w-4xl overflow-hidden flex flex-col border border-[#fff27a]">
        {/* Header */}
        <div className="bg-[#2e3137] p-4 flex items-center justify-between relative border-b border-[#3a3e47]">
          <div className="flex items-center">
            <PeerGPTLogo />
            <h2 className="text-white text-lg font-semibold ml-2">{assistantName}</h2>
          </div>
          <div className="flex items-center">
            {user?.id && (
              <div className="text-white text-xs bg-[#3a3e47] px-3 py-1 rounded-full border border-[#fff27a]/30 mr-3">
                ID: {user.id.substring(0, 8)}...
              </div>
            )}
            <button
              onClick={handleClearChat}
              className="text-gray-400 hover:text-[#fff27a] transition-colors mr-3 text-xs px-2 py-1 border border-gray-600 rounded-md hover:border-[#fff27a]/50"
            >
              Clear Chat
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-[#fff27a] transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden h-[70vh]">
          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-[#1e1e21]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[calc(70vh-180px)] overflow-y-scroll [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#fff27a] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar-track]:bg-[#1e1e21]">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isLastMessage={index === messages.length - 1}
                  assistantName={assistantName}
                />
              ))}
              {isTyping && <TypingIndicator assistantName={assistantName} />}
              {isError && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> There was a problem connecting to the assistant.</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 bg-[#2e3137] border-t border-[#3a3e47]">
              <div className="bg-[#1e1e21] rounded-lg p-2 mb-2 border border-[#3a3e47] focus-within:border-[#fff27a]/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask ${assistantName} anything about Peer Wealth...`}
                  className="w-full bg-transparent text-white p-2 outline-none resize-none min-h-[60px] max-h-[150px] placeholder-gray-500"
                  rows={1}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendMessage}
                    disabled={inputValue.trim() === "" || isTyping}
                    className={`rounded-full p-2 ${
                      inputValue.trim() === "" || isTyping
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-[#fff27a] hover:bg-[#3a3e47] transition-colors"
                    }`}
                    aria-label="Send message"
                  >
                    <ArrowUp size={18} />
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end items-center">
                <button
                  onClick={handleSendMessage}
                  disabled={inputValue.trim() === "" || isTyping}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputValue.trim() === "" || isTyping
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-[#fff27a] hover:bg-[#f0e86c] text-black"
                  }`}
                >
                  {isTyping ? "Thinking..." : `Ask ${assistantName}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
