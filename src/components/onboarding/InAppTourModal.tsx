'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'

interface SpotlightStep {
  badge: string
  title: string
  description: string
  tip: string
  targetSelector: string | (() => HTMLElement | null)
  color: string
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const SPOTLIGHT_STEPS: SpotlightStep[] = [
  {
    badge: 'Paso 1 de 4 · El Mapa Vivo',
    title: 'Soluciones y oficios cerca de ti',
    description:
      'Cada gota de color en el mapa representa a un vecino a menos de 10 cuadras ofreciendo servicios, prestando herramientas o coordinando favores.',
    tip: 'Toca cualquier pin para ver el precio exacto (S/ o Sin costo) y su descripción.',
    targetSelector: () => {
      if (typeof window === 'undefined') return null
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isMobile = vw <= 900

      // En móvil, la hoja inferior cubre los últimos ~250px del mapa
      const topLimit = 75
      const bottomLimit = isMobile ? vh - 260 : vh - 50
      const rightLimit = isMobile ? vw - 15 : vw - 430

      // Buscar todos los pines en el DOM
      const pins = Array.from(
        document.querySelectorAll('.leaflet-marker-icon, .teardrop-pin')
      ) as HTMLElement[]

      let bestPin: HTMLElement | null = null
      let bestDist = Infinity
      const targetCenterX = isMobile ? vw / 2 : rightLimit / 2
      const targetCenterY = (topLimit + bottomLimit) / 2

      for (const pin of pins) {
        const r = pin.getBoundingClientRect()
        if (
          r.width > 0 &&
          r.height > 0 &&
          r.top >= topLimit &&
          r.bottom <= bottomLimit &&
          r.left >= 10 &&
          r.right <= rightLimit
        ) {
          const pinCenterX = r.left + r.width / 2
          const pinCenterY = r.top + r.height / 2
          const dist = Math.hypot(pinCenterX - targetCenterX, pinCenterY - targetCenterY)
          if (dist < bestDist) {
            bestDist = dist
            bestPin = pin
          }
        }
      }

      if (bestPin) return bestPin

      // Fallback: filtros rápidos de mapa o el canvas
      return (
        (document.querySelector('.map-quick-filters') as HTMLElement) ||
        (document.querySelector('.map-canvas') as HTMLElement)
      )
    },
    color: '#0f766e',
    preferredPlacement: 'bottom',
  },
  {
    badge: 'Paso 2 de 4 · Confianza Vecinal',
    title: 'Fichas con Visto Bueno Vecinal',
    description:
      'En la lista de tu zona puedes explorar todas las soluciones con recomendaciones reales y aval de vecinos de tu mismo barrio.',
    tip: 'El sello verde "Visto Bueno Vecinal" garantiza identidad verificada y recomendación comprobada.',
    targetSelector: () => {
      if (typeof window === 'undefined') return null
      const isMobile = window.innerWidth <= 900

      if (isMobile) {
        // En móvil: primera tarjeta de la lista inferior
        const card = document.querySelector('.discovery-sheet .listing-strip .listing-card') as HTMLElement
        if (card) {
          const r = card.getBoundingClientRect()
          if (r.width > 30 && r.height > 30) return card
        }
        return (
          (document.querySelector('.discovery-sheet .sheet-heading') as HTMLElement) ||
          (document.querySelector('.discovery-sheet') as HTMLElement)
        )
      }

      // En escritorio: primera tarjeta de la barra lateral
      return (
        (document.querySelector('.discovery-sheet .listing-card') as HTMLElement) ||
        (document.querySelector('.discovery-sheet .sheet-heading') as HTMLElement) ||
        (document.querySelector('.discovery-sheet') as HTMLElement)
      )
    },
    color: '#059669',
    preferredPlacement: 'left',
  },
  {
    badge: 'Paso 3 de 4 · Publicar en 3 clics',
    title: 'Presta o pide ayuda sin trámites',
    description:
      'Toca "+ Publicar" para compartir una herramienta guardada, ofrecer un oficio o solicitar un favor solidario en solo 3 toques.',
    tip: 'No hay formularios largos. Tu publicación aparece visible en el mapa en 1 segundo.',
    targetSelector: () => {
      if (typeof window === 'undefined') return null
      const isMobile = window.innerWidth <= 900

      if (isMobile) {
        // En móvil: el botón flotante "+ Publicar" de la barra inferior (.bottom-nav)
        const mobilePublish =
          (document.querySelector('.bottom-nav button.is-publish') as HTMLElement) ||
          (document.querySelector('.bottom-nav .is-publish') as HTMLElement)
        if (mobilePublish) {
          const r = mobilePublish.getBoundingClientRect()
          if (r.width > 0 && r.height > 0) return mobilePublish
        }
        // Fallback al 3er botón de la barra inferior
        const navButtons = Array.from(document.querySelectorAll('.bottom-nav button')) as HTMLElement[]
        if (navButtons[2]) return navButtons[2]
      } else {
        // En escritorio: el botón del menú lateral (.desktop-rail)
        const railButtons = Array.from(document.querySelectorAll('.desktop-rail button')) as HTMLElement[]
        const publishRailBtn = railButtons.find((b) => b.textContent?.toLowerCase().includes('publicar'))
        if (publishRailBtn) return publishRailBtn
        if (railButtons[2]) return railButtons[2]
      }

      // Fallback genérico: cualquier botón visible con texto 'publicar'
      const allButtons = Array.from(document.querySelectorAll('button')) as HTMLElement[]
      const visiblePublish = allButtons.find((b) => {
        const text = b.textContent?.toLowerCase() || ''
        if (!text.includes('publicar')) return false
        const r = b.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.top < window.innerHeight && r.bottom > 0
      })
      if (visiblePublish) return visiblePublish

      return (
        (document.querySelector('.bottom-nav') as HTMLElement) ||
        (document.querySelector('.desktop-rail') as HTMLElement)
      )
    },
    color: '#7c3aed',
    preferredPlacement: 'top',
  },
  {
    badge: 'Paso 4 de 4 · Protección Civil',
    title: 'Modo Emergencia 100% Offline',
    description:
      'En caso de sismo, corte de agua o emergencia en el barrio, este botón te conecta con brigadas vecinales y números directos.',
    tip: 'Acceso inmediato a Bomberos (116), Policía (105) y SAMU (106) sin gastar megas.',
    targetSelector: () => {
      if (typeof window === 'undefined') return null
      return (
        (document.querySelector('.topbar__actions .emergency-button') as HTMLElement) ||
        (document.querySelector('.emergency-button') as HTMLElement) ||
        (document.querySelector('.topbar__actions') as HTMLElement)
      )
    },
    color: '#dc2626',
    preferredPlacement: 'bottom',
  },
]

export function InAppTourModal({
  isOpen,
  onClose,
  initialStep = 0,
}: {
  isOpen: boolean
  onClose: () => void
  initialStep?: number
}) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [targetRect, setTargetRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 120, left: 24 })
  const overlayRef = useRef<HTMLDivElement>(null)

  const updatePositions = useCallback(() => {
    if (!isOpen) return
    const step = SPOTLIGHT_STEPS[currentStep]
    if (!step) return

    let el: HTMLElement | null = null
    if (typeof step.targetSelector === 'function') {
      el = step.targetSelector()
    } else {
      el = document.querySelector(step.targetSelector)
    }

    const vw = window.innerWidth
    const vh = window.innerHeight

    if (el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect()
      // Padding adaptativo según el tipo de elemento
      const isPublishStep = currentStep === 2
      const isPinStep = currentStep === 0
      const pad = isPublishStep ? 6 : isPinStep ? 10 : 8

      const boundLeft = Math.max(4, Math.min(vw - 24, rect.left - pad))
      const boundTop = Math.max(4, Math.min(vh - 24, rect.top - pad))
      const boundWidth = Math.max(24, Math.min(vw - boundLeft - 4, rect.width + pad * 2))
      const boundHeight = Math.max(24, Math.min(vh - boundTop - 4, rect.height + pad * 2))

      setTargetRect({
        top: boundTop,
        left: boundLeft,
        width: boundWidth,
        height: boundHeight,
      })

      // Calcular posición del tooltip sin distorsión
      const tooltipWidth = Math.min(340, vw - 24)
      const tooltipHeight = 205 // Altura aproximada de la tarjeta

      let tTop = boundTop + boundHeight + 14
      let tLeft = boundLeft + boundWidth / 2 - tooltipWidth / 2

      if (vw <= 768) {
        // En móvil:
        const spaceBelow = vh - (boundTop + boundHeight)
        const spaceAbove = boundTop

        if (spaceBelow >= tooltipHeight + 16) {
          // Espacio suficiente abajo (ej. pines del mapa o botón SOS arriba)
          tTop = boundTop + boundHeight + 14
        } else if (spaceAbove >= tooltipHeight + 16) {
          // Espacio suficiente arriba (ej. botón publicar o ficha en bottom sheet)
          tTop = boundTop - tooltipHeight - 14
        } else {
          // Si el elemento ocupa mucho alto, ubicarlo donde haya más aire
          tTop = spaceAbove > spaceBelow
            ? Math.max(12, boundTop - tooltipHeight - 10)
            : Math.min(vh - tooltipHeight - 12, boundTop + boundHeight + 10)
        }
        tLeft = Math.max(12, (vw - tooltipWidth) / 2)
      } else {
        // En escritorio: según colocación preferida
        if (step.preferredPlacement === 'left' && boundLeft > tooltipWidth + 24) {
          tLeft = boundLeft - tooltipWidth - 16
          tTop = Math.max(70, Math.min(vh - tooltipHeight - 20, boundTop))
        } else if (step.preferredPlacement === 'right' && (vw - (boundLeft + boundWidth)) > tooltipWidth + 24) {
          tLeft = boundLeft + boundWidth + 16
          tTop = Math.max(70, Math.min(vh - tooltipHeight - 20, boundTop))
        } else if (step.preferredPlacement === 'top' && boundTop > tooltipHeight + 20) {
          tTop = boundTop - tooltipHeight - 16
          tLeft = Math.max(16, Math.min(vw - tooltipWidth - 16, boundLeft))
        } else if (tTop + tooltipHeight > vh - 20) {
          tTop = Math.max(70, boundTop - tooltipHeight - 16)
          tLeft = Math.max(16, Math.min(vw - tooltipWidth - 16, tLeft))
        } else {
          tLeft = Math.max(16, Math.min(vw - tooltipWidth - 16, tLeft))
        }
      }

      tLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, tLeft))
      tTop = Math.max(12, Math.min(vh - tooltipHeight - 12, tTop))
      setTooltipPos({ top: tTop, left: tLeft })
    } else {
      // Fallback centrado si el elemento aún no está en el DOM
      setTargetRect(null)
      setTooltipPos({
        top: Math.max(60, vh / 2 - 100),
        left: Math.max(12, (vw - Math.min(340, vw - 24)) / 2),
      })
    }
  }, [isOpen, currentStep])

  // 1. Resetear el paso SOLO cuando el tour se abre
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep)
      window.speechSynthesis?.cancel()
      setIsSpeaking(false)
    }
  }, [isOpen, initialStep])

  // 2. Actualizar posiciones cuando cambia de paso o redimensiona la pantalla
  useEffect(() => {
    if (!isOpen) return
    updatePositions()
    const timer = setTimeout(updatePositions, 100)
    window.addEventListener('resize', updatePositions)
    window.addEventListener('scroll', updatePositions, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updatePositions)
      window.removeEventListener('scroll', updatePositions, true)
    }
  }, [isOpen, currentStep, updatePositions])

  if (!isOpen) return null

  const step = SPOTLIGHT_STEPS[currentStep] || SPOTLIGHT_STEPS[0]

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const textToSpeak = `${step.title}. ${step.description}. ${step.tip}`
    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    utterance.lang = 'es-PE'
    utterance.rate = 0.95
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const handleClose = () => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    try {
      localStorage.setItem('nexobarrio-tour-completed', '1')
      localStorage.removeItem('nexobarrio-show-tour')
    } catch {
      // ignore
    }
    onClose()
  }

  const handleNext = () => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    if (currentStep < SPOTLIGHT_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="spotlight-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Guía interactiva paso a paso de VECI"
    >
      {/* CAPA DE OSCURECIMIENTO CON RECORTE SUAVE (BOX-SHADOW DINÁMICA) */}
      {targetRect ? (
        <div
          className={`spotlight-focus-box ${currentStep === 2 ? 'is-publish-target' : ''}`}
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderColor: step.color,
            borderRadius: currentStep === 2 ? '9999px' : undefined,
          }}
        >
          {/* Baliza pulsante circular/rectángulo */}
          <div
            className="spotlight-beacon-pulse"
            style={{
              borderColor: step.color,
              borderRadius: currentStep === 2 ? '9999px' : undefined,
            }}
          />
          {/* Indicador animado adaptativo */}
          <span
            className={`spotlight-pointer-hand ${targetRect.top < 65 ? 'is-pointing-up' : ''}`}
            aria-hidden="true"
          >
            {targetRect.top < 65 ? '👆' : '👇'}
          </span>
        </div>
      ) : (
        <div className="spotlight-backdrop-fallback" />
      )}

      {/* TARJETA INTERACTIVA FLOTANTE (RESPONSIVE EN WEB Y MÓVIL) */}
      <div
        className="spotlight-tooltip-card"
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
        }}
      >
        <div className="spotlight-card-header">
          <span
            className="spotlight-step-badge"
            style={{ color: step.color, background: `${step.color}15`, borderColor: `${step.color}40` }}
          >
            {step.badge}
          </span>
          <div className="spotlight-header-actions">
            <button
              type="button"
              className={`spotlight-audio-btn ${isSpeaking ? 'is-active' : ''}`}
              onClick={handleSpeak}
              title="Escuchar narración de voz"
              aria-label="Escuchar narración de voz"
            >
              <Volume2 size={15} />
            </button>
            <button
              type="button"
              className="spotlight-close-btn"
              onClick={handleClose}
              title="Cerrar tour"
              aria-label="Cerrar tour"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <h3 className="spotlight-card-title">{step.title}</h3>
        <p className="spotlight-card-desc">{step.description}</p>

        <div className="spotlight-card-tip">
          <Sparkles size={14} color={step.color} />
          <span>{step.tip}</span>
        </div>

        {/* PIE DE NAVEGACIÓN */}
        <div className="spotlight-card-footer">
          <div className="spotlight-dots">
            {SPOTLIGHT_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`spotlight-dot ${idx === currentStep ? 'is-active' : ''}`}
                style={idx === currentStep ? { background: step.color } : {}}
                onClick={() => {
                  window.speechSynthesis?.cancel()
                  setIsSpeaking(false)
                  setCurrentStep(idx)
                }}
                aria-label={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          <div className="spotlight-nav-actions">
            {currentStep > 0 && (
              <button
                type="button"
                className="secondary-button spotlight-btn-prev"
                onClick={handlePrev}
              >
                <ArrowLeft size={14} /> Anterior
              </button>
            )}
            <button
              type="button"
              className="primary-button spotlight-btn-next"
              onClick={handleNext}
              style={{ background: step.color }}
            >
              <span>{currentStep === SPOTLIGHT_STEPS.length - 1 ? '¡Listo!' : 'Siguiente'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
