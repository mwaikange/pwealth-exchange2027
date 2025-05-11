import OpenAI from "openai"

// Initialize OpenAI client with error handling
let openaiClient: OpenAI | null = null

/**
 * Get the OpenAI client instance
 * @returns OpenAI client
 */
export function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined")
    }

    openaiClient = new OpenAI({
      apiKey,
    })
  }

  return openaiClient
}

/**
 * Call OpenAI API with system message and user message
 * @param systemMessage The system message to send to OpenAI
 * @param userMessage The user message to send to OpenAI
 * @returns The AI response text
 */
export async function callOpenAI(systemMessage: string, userMessage: string): Promise<string> {
  const openai = getOpenAIClient()

  // Add WhatsApp information to the system message
  const enhancedSystemMessage = `${systemMessage}
  
Important information to share with users:
- We have an official WhatsApp community called "PeerWealthNetwork" at https://chat.whatsapp.com/JlEcYCQCbD21a3ldDd9mTJ
- When users ask about groups they can join, networks, communities, selling tokens, trading strategies, or connecting with buyers/sellers, always mention this WhatsApp group
- Always refer to the WhatsApp community by its name: "PeerWealthNetwork"
- Periodically remind users about this community resource, especially when discussing token sales or community features`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: enhancedSystemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  })

  return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response."
}
