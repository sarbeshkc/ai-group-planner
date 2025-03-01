import Button from "@/components/ui/Button"
import { ArrowRight, Calendar, Users, BarChart3, RefreshCw, Shield, Bell, Zap } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 z-0" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                <Zap className="w-4 h-4 mr-2" />
                AI-Powered Planning
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                Plan Smarter, <span className="text-purple-600 dark:text-purple-400">Together</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl">
                Transform team coordination with AI that optimizes roles and adapts in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login" passHref>
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Get Started
                  </Button>
                </Link>
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative h-[350px] lg:h-[450px] rounded-xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-4/5 h-4/5">
                  <svg className="w-full h-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-purple-200 dark:text-purple-800"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-blue-300 dark:text-blue-700"
                    />
                    <line
                      x1="100"
                      y1="20"
                      x2="100"
                      y2="180"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-purple-400 dark:text-purple-600"
                    />
                    <line
                      x1="20"
                      y1="100"
                      x2="180"
                      y2="100"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-blue-400 dark:text-blue-600"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="5"
                      fill="currentColor"
                      className="text-purple-500 dark:text-purple-400 animate-pulse"
                    />
                    <circle
                      cx="140"
                      cy="60"
                      r="3"
                      fill="currentColor"
                      className="text-blue-500 dark:text-blue-400 animate-ping"
                    />
                    <circle
                      cx="60"
                      cy="140"
                      r="3"
                      fill="currentColor"
                      className="text-purple-500 dark:text-purple-400 animate-ping"
                    />
                    <circle
                      cx="140"
                      cy="140"
                      r="3"
                      fill="currentColor"
                      className="text-blue-500 dark:text-blue-400 animate-ping"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="3"
                      fill="currentColor"
                      className="text-purple-500 dark:text-purple-400 animate-ping"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">AI Planning</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900" id="features">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Key Features</h2>
            <p className="text-gray-600 dark:text-gray-300">
              AI-powered planning that makes team coordination effortless
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Smart Role Matching",
                description: "AI matches team members to roles based on skills and preferences",
              },
              {
                icon: RefreshCw,
                title: "Adaptive Planning",
                description: "Plans adapt to changing circumstances and team updates",
              },
              {
                icon: Calendar,
                title: "Task Distribution",
                description: "Balanced workload assignment based on capabilities and timelines",
              },
              {
                icon: BarChart3,
                title: "Team Integration",
                description: "Coordinate input from all team members into one cohesive plan",
              },
              {
                icon: Shield,
                title: "Secure Data",
                description: "Enterprise-grade security for all your planning data",
              },
              {
                icon: Bell,
                title: "Real-time Updates",
                description: "Instant notifications on plan changes and completions",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-gray-600 dark:text-gray-300">Three simple steps to transform your team planning</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Add Team",
                description: "Input team members, skills, and availability",
              },
              {
                step: "02",
                title: "Set Goals",
                description: "Define project objectives and timeline",
              },
              {
                step: "03",
                title: "AI Plans",
                description: "Get optimal role assignments and task distribution",
              },
            ].map((step, index) => (
              <div key={index} className="flex-1 relative">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-full">
                  <div className="text-4xl font-bold text-purple-200 dark:text-purple-800 mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-8 w-8 text-purple-300 dark:text-purple-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to revolutionize your team planning?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Join thousands of teams already using PlanAI to streamline coordination and boost productivity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="primary">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                Schedule Demo
              </Button>
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No credit card required. 14-day free trial.</p>
          </div>
        </div>
      </section>

      {/* Visual Divider Section */}
      <section className="py-20 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="bg-white dark:bg-gray-900 px-4">
                <svg
                  className="h-12 w-12 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

