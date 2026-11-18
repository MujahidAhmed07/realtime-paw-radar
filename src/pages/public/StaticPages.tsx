import { Link } from 'react-router-dom'
import { PawPrint, MapPin, Bell, MessageCircle, Lock, Eye, Database, Zap, Users, CheckCircle2 } from 'lucide-react'

export function AboutPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-sm font-medium text-accent-700"><PawPrint className="h-4 w-4" /> About PetAlert</span>
        <h1 className="mt-4">Every pet deserves to find its way home</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          PetAlert is a location-based lost &amp; found pet platform. When a pet goes missing, the owner files a report with photos
          and the last-seen location. Users near that location receive an instant real-time alert based on the distance they've
          chosen. Anyone who spots the pet can submit a sighting with photos and GPS — and the owner is notified immediately.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Zap, title: 'Real-time alerts', text: 'Reports broadcast instantly to nearby users over WebSockets — no refresh needed.' },
            { icon: MapPin, title: 'Location intelligence', text: 'Radius-based matching (1–10 km) powered by geospatial queries. No continuous tracking.' },
            { icon: Lock, title: 'Privacy first', text: 'Exact owner addresses are never published. Contact details are only shared with your consent.' },
            { icon: MessageCircle, title: 'Private messaging', text: 'Owners and finders coordinate in-app without exposing phone numbers or emails.' },
            { icon: Eye, title: 'Community moderation', text: 'Users can flag suspicious reports; admins review, resolve and moderate content.' },
            { icon: Database, title: 'Reliable persistence', text: 'Photos, reports, and messages are stored durably — not in your browser cache.' }
          ].map(f => (
            <div key={f.title} className="card-surface p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-50 text-secondary"><f.icon className="h-5 w-5" /></span>
              <h3>{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="card-surface mt-10 p-6">
          <h2>Our promise</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> AI matching only suggests — it never claims a pet's identity automatically.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> Location data is stored only when you enable nearby alerts, and only at the precision you allow.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> You can delete your reports and account data at any time.</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 font-semibold text-white hover:bg-secondary-700"><Users className="h-5 w-5" /> Join PetAlert</Link>
          <Link to="/how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-input px-6 py-3 font-semibold hover:bg-muted">How it works</Link>
        </div>
      </div>
    </div>
  )
}

export function HowItWorksPage() {
  const steps = [
    { n: '1', title: 'Create your account', text: 'Register with your email. Set your notification radius (1, 3, 5, or 10 km) and share your location once — only if you want nearby alerts.', icon: Users },
    { n: '2', title: 'Report a lost pet', text: 'Fill in pet details, upload photos, and drop a pin at the last-seen location. You choose the alert radius for the search.', icon: PawPrint },
    { n: '3', title: 'Neighbors get alerted', text: 'Everyone within the radius who has location alerts enabled receives a real-time notification with the report link.', icon: Bell },
    { n: '4', title: 'Sightings come in', text: 'Anyone who spots the pet submits a sighting with photos, notes, and GPS. You get an instant notification for every sighting.', icon: Eye },
    { n: '5', title: 'Coordinate privately', text: 'Chat with the finder in-app. Share contact info only when you choose to. AI may suggest similar found reports for you to review.', icon: MessageCircle },
    { n: '6', title: 'Reunite & close', text: 'Once your pet is home, mark the report as reunited. The community celebrates and the report leaves the live map.', icon: CheckCircle2 }
  ]
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <h1>How PetAlert works</h1>
        <p className="mt-3 text-lg text-muted-foreground">From a lost pet to a happy reunion — in six steps.</p>
        <div className="mt-10 space-y-4">
          {steps.map(s => (
            <div key={s.n} className="card-surface flex gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">{s.n}</div>
              <div>
                <h3 className="flex items-center gap-2"><s.icon className="h-4 w-4 text-secondary" /> {s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="card-surface mt-10 p-6">
          <h2>Privacy &amp; location</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            PetAlert does not track your location in the background. Your browser asks permission only when you explicitly use a
            location feature, and stored location is used solely to compute distances for nearby alerts. You can disable location
            alerts at any time in Profile Settings, and alerts honor per-user notification preferences.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register" className="rounded-xl bg-secondary px-6 py-3 font-semibold text-white hover:bg-secondary-700">Get started — it's free</Link>
          <Link to="/map" className="rounded-xl border border-input px-6 py-3 font-semibold hover:bg-muted">Explore the live map</Link>
        </div>
      </div>
    </div>
  )
}
