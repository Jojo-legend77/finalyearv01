import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Mail, Phone } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "@/components/ui/button";

const features = [
  { title: "Attendance Tracking", desc: "Monitor attendance in real time so parents and staff can react early." },
  { title: "Grade Analytics", desc: "See performance trends across sections and subjects without digging through records." },
  { title: "AI Insights", desc: "Surface useful patterns for intervention, planning, and communication." },
];

const dashboardHighlights = [
  { label: "Attendance", value: "95%" },
  { label: "Grades", value: "A- Average" },
  { label: "Behavior", value: "Good" },
];

function HomePage() {
  const { user } = useAuth();
  const dashboardPath = user?.role === "school_director" ? "/school-director" : `/${user?.role}`;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-20 right-0 h-60 w-60 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <header className="glass-strong sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            SchoolConnect AI
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#home" className="hover:text-foreground transition-colors">Home</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link to={dashboardPath}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 lg:px-8 py-12 lg:py-20">
        <section id="home" className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Smarter parent–school communication
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg">
              Track attendance, grades, behavior, and get AI-powered insights in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg">
                  <Link to={dashboardPath}>
                    Open Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-8 pt-4">
              {[
                { value: "24/7", label: "Visibility" },
                { value: "Live", label: "Notifications" },
                { value: "AI", label: "Insights" },
              ].map((m) => (
                <div key={m.label}>
                  <strong className="text-xl block">{m.value}</strong>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Dashboard Preview</span>
              <span className="text-xs rounded-full bg-success/10 text-success px-2 py-0.5 font-medium">Live</span>
            </div>
            <div className="space-y-3">
              {dashboardHighlights.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <strong className="text-sm font-semibold">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mt-24 space-y-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Features</p>
            <h2 className="text-2xl font-semibold mt-1">Everything in one connected platform</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature) => (
              <article key={feature.title} className="glass rounded-xl p-6 hover:border-primary/30 transition-colors">
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="mt-24 glass rounded-2xl p-8 lg:p-12">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">About</p>
          <h2 className="text-2xl font-semibold mt-1 mb-4">Built for daily school communication</h2>
          <p className="text-muted-foreground max-w-2xl">
            This platform keeps parents, teachers, admins, and school directors connected with fewer clicks and clearer updates.
          </p>
        </section>

        <section id="contact" className="mt-24 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contact</p>
            <h2 className="text-2xl font-semibold mt-1">Contact the admin team directly</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <a href="mailto:admin@school.local" className="glass rounded-xl p-6 flex items-start gap-4 hover:border-primary/30 transition-colors">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-muted-foreground">Admin Gmail</span>
                <strong className="block text-sm mt-1">admin@school.local</strong>
              </div>
            </a>
            <a href="tel:+15550100" className="glass rounded-xl p-6 flex items-start gap-4 hover:border-primary/30 transition-colors">
              <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-muted-foreground">Phone</span>
                <strong className="block text-sm mt-1">+1-555-0100</strong>
              </div>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 SchoolConnect AI. All rights reserved.
      </footer>
    </div>
  );
}

export default HomePage;

