import { useEffect } from 'react'

/**
 * Section entrances: elements with [data-reveal] rise into place once, staggered by their
 * --reveal-index. Content is visible without JavaScript; the hidden start state only applies
 * once this runs (html.reveal-ready), and reduced motion skips the travel in CSS.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('reveal-ready')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-revealed', '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
    return () => {
      observer.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])
}
