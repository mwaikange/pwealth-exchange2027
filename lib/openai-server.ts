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

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  })

  return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response."
}
