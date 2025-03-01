"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "@/lib/firebase/auth"
import Input from "@/components/ui/Input"
import Button from "@/components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { ArrowRight, Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Failed to sign in. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="m-auto w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back to <span className="text-purple-600 dark:text-purple-400">PlanAI</span>
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Sign up now
            </Link>
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center text-gray-900 dark:text-white">
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <Input
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                //   icon={<Mail className="h-5 w-5 text-gray-400" />}
                />

                <Input
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                //   icon={<Lock className="h-5 w-5 text-gray-400" />}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    href="#"
                    className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                isLoading={loading}
                fullWidth
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-600 dark:text-gray-400">
            By signing in, you agree to our{" "}
            <Link
              href="#"
              className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="#"
              className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300"
            >
              Privacy Policy
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

