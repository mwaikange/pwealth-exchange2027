"use client"

import type React from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { register } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Label } from "../ui/label"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  referrerEmail: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
})

export function RegisterForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [error, setError] = useState<string>("")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      referrerEmail: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    setError("")

    try {
      await register(values.name, values.email, values.password, values.referrerEmail)
      toast({
        title: "Registration successful!",
        description: "You will be redirected to the login page.",
      })
      router.push("/login")
    } catch (error: any) {
      toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError("")

    try {
      // Assuming registerUser function exists and handles registration logic
      // and returns { success: boolean, message?: string }
      const name = formData.get("name") as string
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      const referrerEmail = formData.get("referrerEmail") as string | undefined

      const result = await register(name, email, password, referrerEmail)

      if (result) {
        // Redirect to verification page with email
        router.push(`/verify-email?email=${encodeURIComponent(email)}`)
      } else {
        setError("Registration failed")
      }
    } catch (error: any) {
      setError(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Enter your password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <Label htmlFor="referrerEmail">Referrer Email (Optional)</Label>
            <Input
              id="referrerEmail"
              name="referrerEmail"
              type="email"
              placeholder="Enter referrer's email if you have one"
              {...form.register("referrerEmail")}
            />
            <p className="text-xs text-muted-foreground">You can also add this later in settings</p>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <Button disabled={isLoading}>
            {isLoading && (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Register
          </Button>
        </form>
      </Form>
    </div>
  )
}
