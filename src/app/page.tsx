import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  CogIcon,
  LockClosedIcon,
  ServerIcon,
  UserGroupIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Intelligent Role Matching',
    description:
      'Our AI system matches team members to roles based on their skills, experience, and preferences, ensuring optimal team composition.',
    icon: UserGroupIcon,
  },
  {
    name: 'Adaptive Planning',
    description:
      'Plans automatically adapt to changing circumstances, constraints, and real-time updates from team members.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Efficient Task Distribution',
    description:
      'AI-driven task assignment considers workload balance, timelines, dependencies, and individual capabilities.',
    icon: CalendarIcon,
  },
  {
    name: 'Multi-perspective Integration',
    description:
      'Process input from 5-10 team members simultaneously to create a coordinated plan that reflects all perspectives.',
    icon: ChartBarIcon,
  },
  {
    name: 'Secure Data Processing',
    description:
      'All your team and planning data is encrypted and processed with enterprise-grade security measures.',
    icon: LockClosedIcon,
  },
  {
    name: 'Real-time Updates',
    description:
      'Get immediate notifications and updates on plan changes, task completions, and team communications.',
    icon: ServerIcon,
  },
];

const testimonials = [
  {
    body: 'PlanAI has transformed how our team coordinates projects. What used to take days of back-and-forth now happens in minutes with much better outcomes.',
    author: {
      name: 'Emily Chen',
      title: 'Project Manager at TechCorp',
      imageUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: 'As a student organization leader, PlanAI has been a game-changer for coordinating our events. The AI suggestions for task assignments are surprisingly insightful!',
    author: {
      name: 'Marcus Johnson',
      title: 'President, University Tech Club',
      imageUrl:
        'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
  {
    body: 'Our community volunteer group now operates with the efficiency of a Fortune 500 company thanks to PlanAI. The role matching feature saved us countless hours.',
    author: {
      name: 'Sophia Williams',
      title: 'Director, Community First',
      imageUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
  },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative bg-gray-50">
        <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8">
          <div className="px-6 pb-24 pt-10 sm:pb-32 lg:col-span-7 lg:px-0 lg:pb-56 lg:pt-48 xl:col-span-6">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <div className="hidden sm:flex">
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                  Revolutionary group planning powered by AI.{' '}
                  <a href="#" className="whitespace-nowrap font-semibold text-primary-600">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Learn more <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>
              <h1 className="mt-24 text-4xl font-bold tracking-tight text-gray-900 sm:mt-10 sm:text-6xl">
                AI-Powered Group Planning System
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Transform how your team plans, coordinates, and executes projects with our intelligent platform. 
                Harness the power of AI to optimize role assignments, task distribution, and real-time adaptations.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href="/register"
                  className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  Get started
                </Link>
                <Link href="#features" className="text-sm font-semibold leading-6 text-gray-900">
                  Learn more <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
          <div className="relative lg:col-span-5 lg:-mr-8 xl:absolute xl:inset-0 xl:left-1/2 xl:mr-0">
            <div className="aspect-[3/2] w-full bg-gray-50 object-cover lg:absolute lg:inset-0 lg:aspect-auto lg:h-full">
              <div className="h-full w-full bg-gradient-to-r from-primary-400 to-secondary-400 opacity-70"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature section */}
      <div className="py-24 sm:py-32" id="features">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Plan Smarter</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to coordinate your team
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered platform streamlines group coordination by intelligently processing input from all team members
              to create optimized plans with ideal role assignments and task distributions.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-gray-900">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                      <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    {feature.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Testimonial section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Hear what our users have to say
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              From project managers to community organizers, see how PlanAI is transforming group coordination across industries.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 border-t border-gray-200 pt-10 sm:mt-16 sm:pt-16 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article key={testimonial.author.name} className="flex max-w-xl flex-col items-start">
                <div className="relative mt-8 flex items-center gap-x-4">
                  <img
                    src={testimonial.author.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-full bg-gray-50"
                  />
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-gray-900">{testimonial.author.name}</p>
                    <p className="text-gray-600">{testimonial.author.title}</p>
                  </div>
                </div>
                <p className="mt-4 text-base leading-6 text-gray-600">{testimonial.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-white">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to transform your team&apos;s planning?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Join thousands of teams who are already using PlanAI to streamline coordination, 
              save time, and achieve better outcomes.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/register"
                className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                Get started for free
              </Link>
              <Link href="#" className="text-sm font-semibold leading-6 text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}