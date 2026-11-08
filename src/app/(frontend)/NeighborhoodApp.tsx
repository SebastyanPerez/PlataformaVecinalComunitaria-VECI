'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  Filter,
  HandHeart,
  Heart,
  Home,
  Layers3,
  ListFilter,
  Map,
  MapPin,
  Mic,
  Menu,
  MessageCircle,
  Navigation,
  PackageOpen,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { SplashScreen } from '@/components/onboarding/SplashScreen'
import { OnboardingView } from '@/components/onboarding/OnboardingView'
import { InAppTourModal } from '@/components/onboarding/InAppTourModal'
import { CommunityTab } from '@/components/community/CommunityTab'
import { EmergencyModal } from '@/components/modals/EmergencyModal'
import { listingArt } from '@/lib/listing-art'
import { TriangularBarterPanel } from '@/components/explore/TriangularBarterPanel'
import { ImpactModal } from '@/components/modals/ImpactModal'
import { ProviderProfileModal } from '@/components/modals/ProviderProfileModal'
import { ListingCard } from '@/components/cards/ListingCard'
import { ProfileModal } from '@/components/modals/ProfileModal'
import { DetailModal } from '@/components/modals/DetailModal'
import { ActivityTab } from '@/components/activity/ActivityTab'
import { MapTab } from '@/components/map/MapTab'
import { ExploreTab } from '@/components/explore/ExploreTab'
import { PublishTab } from '@/components/publish/PublishTab'

import { currentUser, readLocal, saveSession, writeLocal, type LocalUser } from '@/lib/local-store'
import { api } from '@/lib/api-client'

export type ListingView = {
  id: string
  title: string
  description: string
  kind: string
  modes: string[]
  category: string
  priceLabel?: string
  zoneName: string
  locationLabel: string
  distanceKm?: number
  x: number
  y: number
  image?: string
  availability?: string
  providerName?: string
  initials?: string
  rating?: number
  reviewCount?: number
  completedCount?: number
  approvalAuthor?: string
  approvalZone?: string
  approvalNote?: string
  featured?: boolean
  isDemo?: boolean
  createdAt?: string
}

export type InteractionView = {
  id: string
  summary: string
  type: string
  status: string
  syncState: string
  listingTitle: string
  updatedAt?: string
  role?: 'requester' | 'provider'
  returnFlow?: {
    dueAt?: string
    borrowerConfirmed?: boolean
    lenderConfirmed?: boolean
  }
}

type NotificationView = {
  id: string
  title: string
  body: string
  kind: string
  read: boolean
  deliveryState: string
  createdAt?: string
}

type Tab = 'map' | 'explore' | 'publish' | 'community' | 'activity'
type Modal = 'detail' | 'emergency' | 'profile' | 'impact' | 'help' | 'notifications' | null

const kindLabel: Record<string, string> = {
  product: 'Producto',
  service: 'Servicio',
  skill: 'Habilidad',
  barter: 'Trueque',
  gift: 'Regalo',
  loan: 'Préstamo',
  need: 'Necesidad',
  help: 'Ayuda',
}

const kindIcon: Record<string, typeof Wrench> = {
  service: Wrench,
  product: PackageOpen,
  barter: Sparkles,
  loan: PackageOpen,
  gift: HandHeart,
  help: HandHeart,
  need: Search,
  skill: Users,
}

const tabs: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: 'map', label: 'Mapa', icon: Map },
  { id: 'explore', label: 'Explorar', icon: Compass },
  { id: 'publish', label: 'Publicar', icon: Plus },
  { id: 'community', label: 'Comunidad', icon: Users },
  { id: 'activity', label: 'Actividad', icon: Activity },
]

const publishKinds = ['product', 'service', 'skill', 'barter', 'gift', 'loan', 'need', 'help']

export function NeighborhoodApp({ listings }: { listings: ListingView[] }) {
  const router = useRouter()
  const [splash, setSplash] = useState(true)
  const [splashVisit, setSplashVisit] = useState(0)
  const [onboarding, setOnboarding] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [tab, setTab] = useState<Tab>('map')
  const [modal, setModal] = useState<Modal>(null)
  const [selected, setSelected] = useState<ListingView | null>(listings[0] ?? null)
  const [query, setQuery] = useState('')
  const [voiceNotice, setVoiceNotice] = useState('')
  const [geoNotice, setGeoNotice] = useState('')
  const [activeKind, setActiveKind] = useState('all')
  const [nowOnly, setNowOnly] = useState(false)
  const [radiusKm, setRadiusKm] = useState(3)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'recent'>('distance')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [publishKind, setPublishKind] = useState('')
  const [published, setPublished] = useState(false)
  const [zone, setZone] = useState('Centro Cívico')
  const [liveListings, setLiveListings] = useState(listings)
  const [sessionUser, setSessionUser] = useState<LocalUser | null>(null)
  const [interactions, setInteractions] = useState<InteractionView[]>([])
  const [publishMessage, setPublishMessage] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [photoName, setPhotoName] = useState('')
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [notifications, setNotifications] = useState<NotificationView[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const signedInName = sessionUser?.displayName

  const completeSplash = useCallback(() => {
    let hasOnboarded = false
    try {
      hasOnboarded = Boolean(window.localStorage.getItem('nexobarrio-onboarded'))
    } catch {
      // The intro must still finish when browser storage is unavailable.
    }
    setOnboarding(!hasOnboarded)
    if (hasOnboarded) {
      const queryParams = new URLSearchParams(window.location.search)
      let wantsTour = queryParams.get('tour') === '1'
      try {
        wantsTour ||= window.localStorage.getItem('nexobarrio-show-tour') === '1'
        if (wantsTour) window.localStorage.removeItem('nexobarrio-show-tour')
      } catch {
        // URL-driven tours also work without browser storage.
      }
      setShowTour(wantsTour)
    }
    setSplash(false)
  }, [])

  useEffect(() => {
    const replaySplash = () => {
      if (window.location.pathname !== '/') return
      setOnboarding(false)
      setShowTour(false)
      setSplashVisit((visit) => visit + 1)
      setSplash(true)
    }
    const restorePage = (event: PageTransitionEvent) => {
      if (event.persisted) replaySplash()
    }

    // Re-entering a cached route can restore state with the intro already finished.
    replaySplash()
    window.addEventListener('popstate', replaySplash)
    window.addEventListener('pageshow', restorePage)
    return () => {
      window.removeEventListener('popstate', replaySplash)
      window.removeEventListener('pageshow', restorePage)
    }
  }, [])

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem('nexobarrio-accessibility') || '{}')
      document.documentElement.dataset.fontScale = preferences.fontScale || 'normal'
      document.documentElement.dataset.highContrast = preferences.highContrast ? 'true' : 'false'
      document.documentElement.dataset.simpleView = preferences.simpleView ? 'true' : 'false'
    } catch {
      /* Default settings remain usable. */
    }
    try {
      const savedIds = JSON.parse(window.localStorage.getItem('nexobarrio-favorites') || '[]')
      if (Array.isArray(savedIds)) setSaved(new Set(savedIds.map(String)))
      const savedDraft = JSON.parse(window.localStorage.getItem('nexobarrio-draft') || 'null')
      if (savedDraft && typeof savedDraft === 'object') {
        setDraft(savedDraft)
        if (typeof savedDraft.kind === 'string') setPublishKind(savedDraft.kind)
      }
    } catch {
      window.localStorage.removeItem('nexobarrio-favorites')
      window.localStorage.removeItem('nexobarrio-draft')
    }
    const savedZone = window.localStorage.getItem('nexobarrio-zone')
    if (savedZone) setZone(savedZone)
    setIsOnline(window.navigator.onLine)
    setSessionUser(currentUser())
    setLiveListings([...readLocal<ListingView[]>('nexobarrio-listings', []), ...listings])
    setInteractions(readLocal<InteractionView[]>('nexobarrio-interactions', []))

    // Cargar sesión, publicaciones e interacciones reales de FastAPI + Supabase
    void api.getSession().then((user) => {
      if (user) setSessionUser(user)
    })
    void api.getListings().then((remoteListings) => {
      if (remoteListings && remoteListings.length > 0) {
        setLiveListings(remoteListings)
      }
    })
    void api.getInteractions().then((remoteInteractions) => {
      if (remoteInteractions && remoteInteractions.length > 0) {
        setInteractions(remoteInteractions)
      }
    })
    void api.getNotifications().then((remoteNotifications) => {
      if (remoteNotifications?.notifications) {
        setNotifications(remoteNotifications.notifications)
        setUnreadNotifications(remoteNotifications.unread ?? 0)
      }
    })

    if ('serviceWorker' in window.navigator && process.env.NODE_ENV === 'production') {
      void window.navigator.serviceWorker.register('/sw.js')
    }

  }, [router])

  useEffect(() => {
    const handleOffline = () => setIsOnline(false)
    const handleOnline = () => {
      setIsOnline(true)
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase()
    const matches = liveListings.filter((item) => {
      const matchesKind =
        activeKind === 'all' || item.kind === activeKind || item.modes.includes(activeKind)
      const matchesQuery =
        !normalized ||
        `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(normalized)
      return (
        matchesKind &&
        matchesQuery &&
        (!nowOnly || item.availability === 'now') &&
        (item.distanceKm == null || item.distanceKm <= radiusKm)
      )
    })
    return matches.sort((a, b) =>
      sortBy === 'rating'
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : sortBy === 'recent'
          ? (b.createdAt || '').localeCompare(a.createdAt || '')
          : (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    )
  }, [activeKind, liveListings, query, nowOnly, radiusKm, sortBy])

  const openDetail = (listing: ListingView) => {
    setSelected(listing)
    setModal('detail')
  }

  const startVoiceSearch = () => {
    type Recognition = {
      lang: string
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
      onerror: (() => void) | null
      start: () => void
    }
    const BrowserRecognition =
      (
        window as typeof window & {
          SpeechRecognition?: new () => Recognition
          webkitSpeechRecognition?: new () => Recognition
        }
      ).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => Recognition })
        .webkitSpeechRecognition
    if (!BrowserRecognition) {
      setVoiceNotice('El dictado no está disponible en este navegador.')
      return
    }
    const recognition = new BrowserRecognition()
    recognition.lang = 'es-PE'
    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript)
      setVoiceNotice('Búsqueda dictada correctamente.')
    }
    recognition.onerror = () => setVoiceNotice('No pudimos escuchar. Intenta de nuevo.')
    recognition.start()
  }

  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      window.localStorage.setItem('nexobarrio-favorites', JSON.stringify([...next]))
      return next
    })
  }

  const saveDraft = (form: HTMLFormElement, announce = true) => {
    const data = new FormData(form)
    const nextDraft = {
      kind: publishKind,
      title: String(data.get('title') || ''),
      description: String(data.get('description') || ''),
      category: String(data.get('category') || ''),
      priceLabel: String(data.get('priceLabel') || ''),
      zoneName: zone,
    }
    window.localStorage.setItem('nexobarrio-draft', JSON.stringify(nextDraft))
    if (announce) {
      setDraft(nextDraft)
      setPublishMessage('Borrador guardado en este dispositivo.')
    }
  }

  const submitListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!publishKind) return
    const form = event.currentTarget
    const data = new FormData(form)
    const draft = {
      kind: publishKind,
      title: String(data.get('title') || ''),
      description: String(data.get('description') || ''),
      category: String(data.get('category') || ''),
      priceLabel: String(data.get('priceLabel') || ''),
      acceptsBarter: data.get('acceptsBarter') === 'on',
      zoneName: zone,
    }

    window.localStorage.setItem('nexobarrio-draft', JSON.stringify(draft))
    setPublishing(true)
    setPublishMessage('')

    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        kind: draft.kind,
        category: draft.category || 'General',
        priceLabel: draft.priceLabel,
        zoneName: zone,
        acceptsBarter: draft.acceptsBarter,
        x: 35 + Math.round(Math.random() * 30),
        y: 35 + Math.round(Math.random() * 30),
      }

      const remoteListing = await api.createListing(payload)
      const listing: ListingView = remoteListing || {
        id: crypto.randomUUID(),
        title: payload.title,
        description: payload.description,
        kind: payload.kind,
        modes: [payload.kind, ...(payload.acceptsBarter ? ['barter'] : [])],
        category: payload.category,
        priceLabel: payload.priceLabel,
        zoneName: zone,
        locationLabel: `Cerca de ${zone}`,
        distanceKm: 0.5,
        x: payload.x,
        y: payload.y,
        providerName: sessionUser?.displayName || 'Vecino de la zona',
        initials: (sessionUser?.displayName || 'NB').slice(0, 2).toUpperCase(),
        createdAt: new Date().toISOString(),
      }
      const next = [listing, ...readLocal<ListingView[]>('nexobarrio-listings', [])]
      writeLocal('nexobarrio-listings', next)
      setLiveListings((current) => [listing, ...current])
      setSelected(listing)
      window.localStorage.removeItem('nexobarrio-draft')
      setDraft(null)
      form.reset()
      setPhotoName('')
      setPublished(true)
      setPublishMessage(
        remoteListing
          ? 'Publicación guardada en Supabase y visible para tus vecinos.'
          : 'Publicación guardada en este dispositivo.',
      )
    } catch {
      setPublishMessage('No se pudo guardar. El borrador sigue disponible.')
    } finally {
      setPublishing(false)
    }
  }

  if (splash) {
    return <SplashScreen key={splashVisit} onComplete={completeSplash} />
  }

  if (onboarding) {
    return (
      <OnboardingView
        onComplete={(destination?: string) => {
          setOnboarding(false)
          if (destination && destination !== '/') {
            router.push(destination)
          }
        }}
      />
    )
  }

  return (
    <main className="app-shell">
      <aside className="desktop-rail" aria-label="Navegación principal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? 'is-active' : ''}
            onClick={() => setTab(id)}
            aria-label={label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <button className="rail-profile" onClick={() => setModal('profile')} aria-label="Perfil">
          <span>{signedInName?.slice(0, 2).toUpperCase() || 'DE'}</span>
        </button>
      </aside>

      <section className="app-main">
        <header className="topbar">
          <div className="brand-lockup topbar__brand">
            <img
              src="/images/veci-logo.jpg"
              alt="VECI"
              className="brand-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallback = e.currentTarget.parentElement?.querySelector('.brand-mark-fallback')
                if (fallback) (fallback as HTMLElement).style.display = 'grid'
              }}
            />
            <span className="brand-mark brand-mark-fallback" style={{ display: 'none' }}>
              V
            </span>
            <span>VECI</span>
          </div>
          <button
            className="zone-button"
            onClick={() => setZone(zone === 'Centro Cívico' ? 'Santa Beatriz' : 'Centro Cívico')}
          >
            <MapPin size={17} />
            <span>
              <small>Explorando</small>
              {zone}
            </span>
            <ChevronDown size={16} />
          </button>
          <label className="global-search">
            <Search size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="¿Qué necesitas cerca?"
              aria-label="Búsqueda global"
            />
            <kbd>⌘ K</kbd>
            <button
              type="button"
              className="voice-search"
              onClick={startVoiceSearch}
              aria-label="Buscar con voz"
            >
              <Mic size={19} />
            </button>
          </label>
          {voiceNotice && (
            <span className="voice-notice" role="status">
              {voiceNotice}
            </span>
          )}
          <div className="topbar__actions">
            <button className="text-icon-button" onClick={() => setModal('help')}>
              <CircleHelp size={19} />
              <span>Ayuda</span>
            </button>
            <button className="emergency-button" onClick={() => setModal('emergency')}>
              <AlertTriangle size={18} />
              <span>Emergencia</span>
            </button>
            <button
              className="round-control has-badge"
              onClick={() => setModal('notifications')}
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && <i />}
            </button>
            <button className="avatar-button" onClick={() => setModal('profile')}>
              {signedInName?.slice(0, 2).toUpperCase() || 'DE'}
            </button>
          </div>
        </header>

        {!isOnline && (
          <div
            className={`connection-banner ${isOnline ? '' : 'is-offline'}`}
            role="status"
            aria-live="polite"
          >
            <WifiOff size={18} />
            <span>
              <strong>
                Estás navegando sin conexión a internet
              </strong>
              <small>
                Tus datos locales siguen disponibles en este dispositivo.
              </small>
            </span>
          </div>
        )}

        {tab === 'map' && (
          <MapTab
            filtered={filtered}
            selected={selected}
            setSelected={setSelected}
            sheetOpen={sheetOpen}
            setSheetOpen={setSheetOpen}
            nowOnly={nowOnly}
            setNowOnly={setNowOnly}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            activeKind={activeKind}
            setActiveKind={setActiveKind}
            saved={saved}
            toggleSaved={toggleSaved}
            openDetail={openDetail}
            onPublish={() => setTab('publish')}
            geoNotice={geoNotice}
            setGeoNotice={setGeoNotice}
            onStartTour={() => setShowTour(true)}
          />
        )}

        {tab === 'explore' && (
          <ExploreTab
            filtered={filtered}
            activeKind={activeKind}
            setActiveKind={setActiveKind}
            sortBy={sortBy}
            setSortBy={setSortBy}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            saved={saved}
            toggleSaved={toggleSaved}
            openDetail={openDetail}
            onPublish={() => setTab('publish')}
            onMap={() => setTab('map')}
          />
        )}

        {tab === 'publish' && (
          <PublishTab
            publishKind={publishKind}
            setPublishKind={setPublishKind}
            draft={draft}
            published={published}
            setPublished={setPublished}
            publishMessage={publishMessage}
            publishing={publishing}
            photoName={photoName}
            setPhotoName={setPhotoName}
            signedIn={Boolean(sessionUser)}
            submitListing={submitListing}
            saveDraft={saveDraft}
          />
        )}

        {tab === 'community' && (
          <CommunityTab onOpenListing={() => liveListings[0] && openDetail(liveListings[0])} />
        )}
        {tab === 'activity' && (
          <ActivityTab
            interactions={interactions}
            signedIn={Boolean(sessionUser)}
            onUpdated={(updated) => {
              setInteractions((current) => {
                const next = current.map((item) => item.id === updated.id ? updated : item)
                writeLocal('nexobarrio-interactions', next)
                return next
              })
            }}
          />
        )}
      </section>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`${tab === id ? 'is-active' : ''} ${id === 'publish' ? 'is-publish' : ''}`}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span>
              <Icon size={id === 'publish' ? 25 : 21} />
            </span>
            <small>{label}</small>
          </button>
        ))}
      </nav>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}>
          <section
            className={`modal-panel modal-panel--${modal}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setModal(null)} aria-label="Cerrar">
              <X size={21} />
            </button>
            {modal === 'detail' && selected && (
              <DetailModal
                item={selected}
                saved={saved.has(selected.id)}
                onSave={() => toggleSaved(selected.id)}
                userId={sessionUser?.id}
                onCreated={(interaction) => {
                  setInteractions((current) => {
                    const next = [interaction, ...current]
                    writeLocal('nexobarrio-interactions', next)
                    return next
                  })
                }}
              />
            )}
            {modal === 'emergency' && <EmergencyModal />}
            {modal === 'profile' && (
              <ProfileModal
                user={sessionUser}
                savedCount={saved.size}
                onLogout={async () => {
                  await api.logout()
                  saveSession(null)
                  setSessionUser(null)
                  setModal(null)
                }}
                onOpenImpact={() => setModal('impact')}
                onOpenWelcome={() => {
                  setModal(null)
                  setShowTour(true)
                }}
              />
            )}
            {modal === 'impact' && <ImpactModal listings={liveListings} />}
            {modal === 'help' && (
              <HelpView
                onNavigate={(nextTab, nextModal) => {
                  if (nextTab) setTab(nextTab)
                  setModal(nextModal ?? null)
                }}
                onStartTour={() => {
                  setModal(null)
                  setShowTour(true)
                }}
              />
            )}
            {modal === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                unread={unreadNotifications}
                onMarkAllRead={async () => {
                  await api.markNotificationsRead()
                  setNotifications((current) =>
                    current.map((notification) => ({ ...notification, read: true })),
                  )
                  setUnreadNotifications(0)
                }}
              />
            )}
          </section>
        </div>
      )}

      {/* TOUR ONBOARDING INTERACTIVO DE 5 PASOS */}
      <InAppTourModal isOpen={showTour} onClose={() => setShowTour(false)} />
    </main>
  )
}

function EmptyState({ onPublish, onExpand }: { onPublish: () => void; onExpand?: () => void }) {
  return (
    <div className="empty-state">
      <span>
        <Search size={28} />
      </span>
      <h2>No encontramos resultados cercanos</h2>
      <p>Amplía el radio o publica lo que necesitas para recibir coincidencias.</p>
      {onExpand && (
        <button className="secondary-button" onClick={onExpand}>
          Ampliar radio a 10 km
        </button>
      )}
      <button className="primary-button" onClick={onPublish}>
        Publicar necesidad
      </button>
    </div>
  )
}

function HelpView({
  onNavigate,
  onStartTour,
}: {
  onNavigate: (tab?: Tab, modal?: Modal) => void
  onStartTour?: () => void
}) {
  const [topic, setTopic] = useState<'map' | 'barter' | 'emergency'>('map')
  return (
    <div className="simple-modal">
      <span className="simple-modal__icon">
        <CircleHelp size={28} />
      </span>
      <span className="eyebrow">Centro de ayuda</span>
      <h1>¿Qué quieres resolver?</h1>
      <p>
        Usa el mapa para descubrir por colores, Publicar para ofrecer o pedir en 3 clics, y
        Comunidad para coordinar con tu zona.
      </p>
      <div className="help-options">
        <button
          type="button"
          className={topic === 'map' ? 'is-active' : ''}
          onClick={() => setTopic('map')}
        >
          <Map size={20} />
          <span>
            <strong>Cómo usar el mapa y colores</strong>
            <small>Pines por categoría y vista rápida</small>
          </span>
        </button>
        <button
          type="button"
          className={topic === 'barter' ? 'is-active' : ''}
          onClick={() => setTopic('barter')}
        >
          <Sparkles size={20} />
          <span>
            <strong>Intercambios y préstamos seguros</strong>
            <small>Visto Bueno Vecinal y devolución doble</small>
          </span>
        </button>
        <button
          type="button"
          className={topic === 'emergency' ? 'is-active' : ''}
          onClick={() => setTopic('emergency')}
        >
          <HandHeart size={20} />
          <span>
            <strong>Ayuda del día a día vs. emergencia</strong>
            <small>Cuándo usar cada flujo</small>
          </span>
        </button>
      </div>
      {topic === 'map' && (
        <div className="profile-welcome-box">
          <p>
            <strong>1. Filtra por color:</strong> Cada categoría tiene su propio pin (Azul = Oficios, Morado = Préstamos gratis, Verde = Banco de Tiempo, Naranja = Trueque).
            <br />
            <strong>2. Toca un pin:</strong> Verás el resumen flotante con precio y recomendación, y podrás abrir la ficha completa.
          </p>
          {onStartTour && (
            <button
              type="button"
              className="secondary-button secondary-button--wide"
              style={{ marginBottom: '8px' }}
              onClick={onStartTour}
            >
              <Sparkles size={16} /> Ver tour guiado paso a paso (5 pasos)
            </button>
          )}
          <button
            type="button"
            className="primary-button primary-button--wide"
            onClick={() => onNavigate('map', null)}
          >
            Ir al mapa ahora
          </button>
        </div>
      )}
      {topic === 'barter' && (
        <div className="profile-welcome-box">
          <p>
            <strong>Confianza sin dinero:</strong> Verifica el sello de{' '}
            <em>Visto Bueno Vecinal</em> en la ficha. En préstamos de herramientas, tanto quien
            presta como quien recibe confirman la devolución en la pestaña <strong>Actividad</strong>.
          </p>
          <button
            type="button"
            className="primary-button primary-button--wide"
            onClick={() => onNavigate('explore', null)}
          >
            Explorar trueques y préstamos
          </button>
        </div>
      )}
      {topic === 'emergency' && (
        <div className="profile-welcome-box">
          <p>
            <strong>Emergencia crítica:</strong> Usa el botón rojo superior para llamar sin internet
            a Bomberos (116), Policía (105) o SAMU (106), contactar oficios de soporte o reportar
            vecinos vulnerables en el tablero humanitario.
          </p>
          <button
            type="button"
            className="primary-button primary-button--wide"
            onClick={() => onNavigate(undefined, 'emergency')}
          >
            Abrir módulo de Emergencia
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationsView({
  notifications,
  unread,
  onMarkAllRead,
}: {
  notifications: NotificationView[]
  unread: number
  onMarkAllRead: () => Promise<void>
}) {
  return (
    <div className="simple-modal">
      <span className="simple-modal__icon">
        <Bell size={28} />
      </span>
      <span className="eyebrow">Notificaciones internas</span>
      <h1>Novedades de tu barrio</h1>
      {unread > 0 && (
        <button className="text-button notification-read-all" onClick={onMarkAllRead}>
          Marcar {unread} como leídas
        </button>
      )}
      <div className="notification-list">
        {notifications.length ? (
          notifications.map((notification) => {
            const Icon =
              notification.kind === 'message'
                ? MessageCircle
                : notification.kind === 'reminder'
                  ? Clock3
                  : Sparkles
            return (
              <article key={notification.id} className={notification.read ? '' : 'is-unread'}>
                <span className="activity-icon activity-icon--green">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.body}</p>
                  <small>
                    {notification.deliveryState === 'internal'
                      ? 'Aviso interno confirmado'
                      : notification.deliveryState}
                  </small>
                </div>
              </article>
            )
          })
        ) : (
          <div className="empty-state">
            <span>
              <Bell size={28} />
            </span>
            <h2>Sin avisos nuevos</h2>
            <p>Las solicitudes, mensajes y devoluciones aparecerán aquí.</p>
          </div>
        )}
      </div>
      <p className="prototype-caption">
        Tus avisos y solicitudes se sincronizan con tu barrio y cuentan con respaldo local.
      </p>
    </div>
  )
}
