import Link from 'next/link'
import { BookOpen, Sparkles, Headphones, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">DeepRead AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Your Intelligent
            <span className="text-primary"> Reading Companion</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Transform your reading with AI-powered summaries, audio narration, 
            and deep dives into any concept. Read smarter, not harder.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Start Reading Free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Summarization</h3>
            <p className="text-muted-foreground">
              Select any text and get instant summaries. Understand complex 
              documents in seconds with GPT-4 and Claude.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Headphones className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Listen Anywhere</h3>
            <p className="text-muted-foreground">
              Convert any text to natural-sounding audio with ElevenLabs. 
              Turn your documents into podcasts.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Deep Dive</h3>
            <p className="text-muted-foreground">
              Explore any concept mentioned in your reading. Get definitions, 
              context, and related references instantly.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-24">
          <p className="text-muted-foreground mb-4">
            Supports PDF and EPUB documents
          </p>
          <div className="flex justify-center gap-4 opacity-50">
            <div className="px-4 py-2 bg-white rounded-lg">PDF</div>
            <div className="px-4 py-2 bg-white rounded-lg">EPUB</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t mt-20">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2024 DeepRead AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
