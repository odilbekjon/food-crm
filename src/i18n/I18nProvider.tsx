import { createContext, Fragment, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getLang, setLang as persistLang, translate, type Lang, type TFn } from './core'

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TFn
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang)

  const setLang = useCallback((next: Lang) => {
    persistLang(next)
    setLangState(next)
  }, [])

  const t = useCallback<TFn>((key, params) => translate(lang, key, params), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  // `key` daraxtni qayta yaratadi: format/date yordamchilari ham yangi tilda qayta hisoblanadi.
  return (
    <I18nContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n I18nProvider ichida ishlatilishi kerak')
  return ctx
}

export function useT(): TFn {
  return useI18n().t
}
